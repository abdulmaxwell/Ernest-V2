const ping = async (sock, msg, from) => {
  try {
    const startTime = Date.now();
    const startHR = process.hrtime.bigint();

    // Get system info
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Calculate more precise timing
    const endHR = process.hrtime.bigint();
    const preciseLatency = Number(endHR - startHR) / 1000000; // Convert to milliseconds
    const basicLatency = Date.now() - startTime;

    // Format uptime
    const formatUptime = (seconds) => {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      
      if (days > 0) return `${days}d ${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
      if (minutes > 0) return `${minutes}m ${secs}s`;
      return `${secs}s`;
    };

    // Format memory usage
    const formatBytes = (bytes) => {
      const mb = bytes / 1024 / 1024;
      return `${mb.toFixed(1)}MB`;
    };

    // Get status emoji based on latency
    const getStatusEmoji = (latency) => {
      if (latency < 50) return '🟢';
      if (latency < 150) return '🟡';
      return '🔴';
    };

    // Random response variations
    const responses = [
      '🏓 *Pong!*',
      '⚡ *Lightning Fast!*',
      '🚀 *Ready to Launch!*',
      '💪 *Strong Signal!*',
      '🎯 *On Target!*',
      '🔥 *Blazing Fast!*'
    ];

    const statusMessages = [
      '_Ernest v2 is awake and ready!_',
      '_All systems operational!_',
      '_Running smooth as butter!_',
      '_Locked and loaded!_',
      '_Performance mode: ON_',
      '_Zero downtime warrior!_'
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    const randomStatus = statusMessages[Math.floor(Math.random() * statusMessages.length)];
    const statusEmoji = getStatusEmoji(preciseLatency);

    const response = 
      `${randomResponse}\n` +
      `━━━━━━━━━━━━━━━━━━━\n\n` +
      `${statusEmoji} *Status:* Fully Operational\n` +
      `⚡ *Latency:* ${preciseLatency.toFixed(2)}ms\n` +
      `🕐 *Uptime:* ${formatUptime(uptime)}\n` +
      `🧠 *Memory:* ${formatBytes(memUsage.rss)} used\n` +
      `💾 *Heap:* ${formatBytes(memUsage.heapUsed)}/${formatBytes(memUsage.heapTotal)}\n\n` +
      `🤖 ${randomStatus}\n` +
      `🏆 _Powered by Ernest Tech House_`;

    // Send response and calculate total response time
    const sendStart = Date.now();
    await sock.sendMessage(from, { text: response }, { quoted: msg });
    const totalTime = Date.now() - startTime;

    // Optional: Log performance metrics
    console.log(`Ping command executed - Process: ${preciseLatency.toFixed(2)}ms, Total: ${totalTime}ms`);

  } catch (error) {
    console.error("Error in ping command:", error);
    
    // Enhanced error responses
    const errorResponses = [
      "❌ *Oops!* Something went wrong, but I'm still here!",
      "⚠️ *Minor hiccup!* Ernest v2 is self-healing...",
      "🔧 *Quick restart needed!* Still your reliable bot though!",
      "💔 *Temporary glitch!* My heart's still beating strong!"
    ];
    
    const randomError = errorResponses[Math.floor(Math.random() * errorResponses.length)];
    
    await sock.sendMessage(
      from,
      { 
        text: `${randomError}\n\n_Error logged for debugging. Ernest Tech House is on it!_` 
      },
      { quoted: msg }
    );
  }
};

// Enhanced metadata
ping.description = "Check bot responsiveness, latency, system status, and performance metrics in real-time";
ping.category = "utility";
ping.aliases = ['p', 'status', 'health'];
ping.usage = "ping";
ping.example = "ping";

export default ping;