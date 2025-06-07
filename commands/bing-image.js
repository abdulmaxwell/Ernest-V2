import fetch from "node-fetch";
import { load } from "cheerio"; // You usually just need `load`, not the whole library

class BingApi {
  constructor(cookie) {
    this.cookie = cookie;
    this.headers = {
      'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
      'Accept': "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      'Accept-Language': "en-US,en;q=0.5",
      'Content-Type': "application/x-www-form-urlencoded",
      'Alt-Used': "www.bing.com",
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': "document",
      'Sec-Fetch-Mode': "navigate",
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Cookie': "_U=" + cookie + ';',
      'X-Forwarded-For': '20.' + this.getRandomNum() + '.' + this.getRandomNum() + '.' + this.getRandomNum()
    };
  }

  async createImages(prompt, slowMode) {
    try {
      const queryParam = 'q=' + encodeURIComponent(prompt);
      let credits = await this.getCredits();
      if (!credits) {
        credits = 0;
      }

      let response = await this.sendRequest(credits > 0 ? slowMode : true, queryParam);
      
      // *** IMPORTANT: The original code directly threw an error if status was 200 and contained specific HTML.
      // This logic is flawed. A 200 status usually means success.
      // If the response indicates an error *within* the HTML, you need to handle that,
      // but only *after* checking if it's a redirect (status 302 for Bing Image Creator).
      // Bing Image Creator often redirects to a results page after a successful POST.
      // The original code was throwing an error when it received a 200 OK from the initial POST,
      // which is likely a *success* to start the image generation, but then it's checking for
      // error images in the *redirected HTML*, which is not the right flow for `createImages` method.
      // It should only be processing the redirect to get the EventID.
      
      // Let's assume the previous `sendRequest` correctly handles the initial POST.
      // If `response.status` is 200 here, it means the POST request to create images
      // was successful, but likely *not* a redirect. This could happen if Bing's flow changes.
      // If `response.status` is NOT 200, it's an HTTP error.
      
      // Original logic for errors within a 200 response HTML
      // This block seems to be incorrectly placed, as the `createImages`
      // method should be dealing with the *initial* POST and subsequent redirect,
      // then calling `retrieveImages` for the actual results.
      // If `sendRequest` itself returned a 200 status where it should have been a redirect (302),
      // then something fundamental has changed with Bing's API.
      // For now, let's assume `sendRequest` correctly returns a 302 for success.
      // The error handling for different `errorImages` counts will happen in `retrieveImages`
      // or if an empty HTML is returned from a redirect.
      // For this method, a non-302 status is an issue.
      if (response.status !== 302 && response.status !== 200) { // Expect 302 redirect for success, or 200 for direct content
          throw `HTTP error status: ${response.status}`;
      } else if (response.status === 200) {
          // If it's a 200 OK for the initial POST, it implies no redirect happened.
          // This usually means an immediate error response on the same page.
          const html = await response.text();
          const $ = load(html);
          const errorImages = $(".gil_err_img.rms_img").length; // Check for error images if it's a direct error response

          if (errorImages === 2) {
              throw "Invalid cookie or session expired.";
          } else if (errorImages === 4) {
              throw "Prompt has been blocked by safety filters.";
          } else if ($('#gilen_son').hasClass('show_n')) { // Check for "high demand" message
              throw "Bing Image Creator is currently unavailable due to high demand or slow mode restriction.";
          }
          // If 200 but no obvious errors, it might be a new flow or an empty success.
          // Fall through to check for eventId. If no eventId, retrieveImages will likely fail.
      }


      const eventId = response.headers.get("x-eventid") || new URL(response.url).searchParams.get("id");
      if (!eventId) {
          // This is a critical point. If no eventId, we can't retrieve images.
          throw "Could not get Event ID for image generation. Bing's API flow might have changed.";
      }
      return await this.retrieveImages(eventId);
    } catch (error) {
      throw error;
    }
  }

  async getCredits() {
    try {
      const response = await fetch("https://www.bing.com/create", {
        'headers': this.headers,
        'method': 'GET',
        'mode': "cors"
      });
      const html = await response.text();
      const $ = load(html);
      // Check for token_bal, if not found, it might be a sign of no credits or page change
      const creditsText = $("#token_bal").text();
      return parseInt(creditsText) || 0; // Return 0 if parsing fails
    } catch (error) {
      console.error("Error getting credits:", error);
      return 0; // Assume 0 credits on error
    }
  }

  getRandomNum() {
    return Math.floor(Math.random() * 254) + 1;
  }

  async sendRequest(slowMode, queryParam) {
    try {
      // Bing often expects a specific 'IG' parameter in the URL, which is a session ID.
      // This is often generated when you visit the main create page.
      // Without it, requests can sometimes fail or lead to redirects.
      // For a robust solution, you might need to scrape it from a prior request to /create.
      // For now, let's assume it's implicitly handled or not strictly required for the POST.

      // Also, the 'redirect': "manual" is important to capture the 302 redirect location
      // to extract the Event ID.
      const response = await fetch("https://www.bing.com/images/create?" + queryParam + "&rt=" + (slowMode ? '3' : '4'), {
        'headers': this.headers,
        'method': "POST",
        'mode': 'cors',
        'redirect': "manual" // Crucial for getting the 'Location' header
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  async retrieveImages(eventId) {
    try {
      let retries = 0;
      const maxRetries = 10; // Increased retries for stability
      const delay = 5000; // 5 seconds delay

      while (retries < maxRetries) {
        const response = await fetch("https://www.bing.com/images/create/async/results/1-" + eventId, {
          'headers': this.headers,
          'method': 'GET',
          'mode': 'cors'
        });
        const html = await response.text();

        // Check for specific error messages or pending state
        if (html.includes("\"errorMessage\":\"Pending\"") || html.includes("We're still generating your images")) {
          // If still pending, wait and retry
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
          continue;
        }

        // Check for specific error images on the results page (as observed in original code)
        const $ = load(html);
        const errorImagesCount = $(".gil_err_img.rms_img").length;
        if (errorImagesCount === 2) {
            throw "Invalid cookie or session expired during image retrieval. (ErrorImages 2)";
        } else if (errorImagesCount === 4) {
            throw "Prompt has been blocked by safety filters during image retrieval. (ErrorImages 4)";
        }
        
        let images = [];
        // If html is empty and not pending, it might be a transient error or no images were generated.
        // The original `if (html === '') { throw "Error occurred"; }` was probably too aggressive.
        // If images are found, push them.
        for (let i = 0; i < $(".mimg").length; i++) {
          const imgSrc = $(".mimg")[i].attribs.src;
          if (imgSrc) { // Ensure imgSrc exists before slicing
            const cleanUrl = imgSrc.slice(0, imgSrc.indexOf('?'));
            images.push(cleanUrl);
          }
        }

        if (images.length > 0) {
            return images; // Images found, success!
        } else if (html.trim() === '') {
            // If HTML is empty, wait and retry, maybe it's still loading
            await new Promise(resolve => setTimeout(resolve, delay));
            retries++;
            continue;
        } else {
            // HTML exists, but no images and no pending message. Unknown error or no results.
            throw "No images generated or unexpected response from Bing. HTML received, but no image elements found.";
        }
      }
      throw `Image generation timed out after ${maxRetries} retries.`;
    } catch (error) {
      throw error;
    }
  }
}

const apikyst = [
  // It's highly recommended to store these in environment variables
  // rather than hardcoding them in the file.
  // Make sure these are up-to-date and valid Bing _U cookies.
  "1-8CNXA-k5mm0ruZAUfVI14pAtOvuHOVCTxWg3u6SsBeT4u9FCX5GLLNhFhMDFMEGoRkGPrhbwByZ9l-W5RpnCMVcXqv3d-eSkqB2jyOj7Ib2HnvF9qN1DeXNXVfrTp4um633acUvBwVDVBRBHDnVKRqfbcB_giDh_Yr3d0hIC5dgpM4sU-VgPk-h5F8R6Rlby5Qpdo4RGKeCtMpKlzyBDA",
  "1WdAN6NWWReTpe8bUwYzaxi1pd4ftHnVlnnW1cWoheoYgBA12UUrWG4BIi8ccOKMN3nWt1yZeDDJJugsje9Bw-k6i2yFNOHLuC9NlCjBtmZhxmcgYwIKypNCfFC3WWwWXHqbl5mLsdA-dIw9lHEXTBrF2sxPHPVBmnvZlAJKUiQ6WZrrbP28V4rSDdovN6otPA6VfLpVSwAJ7DYuLHwVIZg",
  "1ttZrlV0EfkbC3IXLYJrSExXotu4nothyxA6tFzP_N4Opx-bkeE3HckcDhJaN-Yl7hdAEm5hnvf9X52aT30ymsgefhXcEFCQCR15GZwumOZy3YXBTrjPwx0dqP8OC1hkU8PwVHFi3hNJfWy6KZ5fhQiTgs3wPL_1nIWRwEpFLJ1BFyOkLVC5SelRk4Msq0R5t1DP3HSAPLz7Pwc9o_iwmow"
];

export default async function bing(sock, msg, from) {
  // SAFELY GET THE MESSAGE TEXT
  const messageText = msg.message?.conversation || 
                      msg.message?.extendedTextMessage?.text || 
                      msg.message?.imageMessage?.caption || 
                      ''; 

  const args = messageText.split(' ').slice(1); // Now messageText is guaranteed to be a string

  const prompt = args.join(' ');

  if (!prompt) {
    await sock.sendMessage(from, {
      text: '❌ Please provide a prompt for image generation!\n\n' +
        'Example: /bing a beautiful sunset over mountains'
    });
    return;
  }

  // Send initial message
  await sock.sendMessage(from, {
    text: '🎨 Generating images with Bing AI...\n' +
      `📝 Prompt: "${prompt}"\n\n` +
      '⏳ Please wait, this may take a few moments...'
  });

  try {
    // Get random API key (cookie)
    const apikey = apikyst[Math.floor(apikyst.length * Math.random())];
    
    if (!apikey) {
        throw new Error("No Bing _U cookie found. Please provide valid cookies in the apikyst array.");
    }

    const bingApi = new BingApi(apikey);

    // Generate images (default to slow mode = false for faster generation)
    const images = await bingApi.createImages(prompt, false);

    if (images && images.length > 0) {
      // You might want to send a success message *before* sending all images if there are many.
      // await sock.sendMessage(from, { text: `✅ Successfully generated ${images.length} images! Sending now...` });

      // Send each image
      for (let i = 0; i < images.length; i++) {
        try {
          // Add a small delay between sending images to avoid WhatsApp rate limits
          // await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          await sock.sendMessage(from, {
            image: { url: images[i] },
            caption: `🎨 Image ${i + 1}/${images.length}\n📝 Prompt: "${prompt}"`
          });
        } catch (imgSendError) {
          console.error(`Error sending image ${i + 1} (${images[i]}):`, imgSendError);
          await sock.sendMessage(from, {
            text: `❌ Failed to send image ${i + 1}. The URL might be broken or network error. URL: ${images[i]}`
          });
        }
      }
      // Send a final success message if all images were sent.
      // Or if the initial success message was suppressed.
      await sock.sendMessage(from, { text: `✅ Image generation complete for prompt: "${prompt}"` });

    } else {
      await sock.sendMessage(from, {
        text: '❌ No images were generated. Please try again with a different prompt.'
      });
    }

  } catch (error) {
    console.error("Bing Command Error:", error); // Use error.stack for more detailed trace if needed

    let errorMessage = '❌ Failed to generate images: ';
    if (typeof error === 'string') {
      errorMessage += error;
    } else if (error instanceof Error) {
      errorMessage += error.message;
    } else {
      errorMessage += 'An unknown error occurred.';
    }

    errorMessage += '\n\n💡 This issue often means the Bing cookie is invalid/expired, or the prompt was blocked. Try updating the cookie or use a different prompt.';

    await sock.sendMessage(from, { text: errorMessage });
  }
}

bing.description = "Generate AI images using Bing Image Creator";
bing.emoji = "🎨";
bing.usage = "/bing [prompt] - Generate images from text description";