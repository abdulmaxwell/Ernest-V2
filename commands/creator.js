export default async function creator(sock, msg, from) {
    try {
        const creatorBox = `
╔════════════════════════════════════════╗
║         👑 PEACE ERNEST PROFILE         ║
╠════════════════════════════════════════╣
║ • Name: Peace Ernest                   ║
║ • Title: Founder, Ernest Tech House    ║
║ • Role: Full-Stack Dev, Visionary 🧠     ║
║ • Languages: JS, Python, Bash, +more    ║
║ • Projects: 50+ (bots, games, tools)   ║
║ • Skills: AI, Web Dev, Automation 🤖    ║
║ • Motto: "Build loud. Move smart."     ║
║ • Contact: peace@dev.com               ║
║ • YouTube: Ernest Tech House 📺        ║
║ • Future: Ernest OS, ErnestNet 💻       ║
╚════════════════════════════════════════╝
`.trim();

        await sock.sendMessage(from, {
            text: creatorBox
        }, { quoted: msg });

    } catch (error) {
        console.error('Error in creator:', error);
        await sock.sendMessage(from, {
            text: '❌ Failed to fetch creator info'
        }, { quoted: msg });
    }
}

export const description = "Displays the legendary Peace Ernest's profile 👑";
export const category = "about";

creator.description = "Displays the legendary Peace Ernest's profile 👑";
creator.category = "about";
//works