const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize with an API key if available in env
const apiKey = process.env.GEMINI_API_KEY || '';
let genAI = null;

if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

/**
 * Analyzes the text for signs of distress, coercion, or panic.
 * Returns one of: 'SAFE', 'DISTRESS', 'NEUTRAL'
 */
async function analyzeDistress(text) {
  // If no API key is provided, use a robust simulated fallback for the hackathon demo.
  if (!genAI) {
    console.log("No GEMINI_API_KEY provided. Using simulated AI analysis.");
    const lowerText = text.toLowerCase();
    
    // Distressed keywords/phrases
    const distressWords = ['help', 'stop', 'leave me alone', 'following me', 'scared', 'creep', 'police', 'danger', 'weird', 'following'];
    // Safe keywords
    const safeWords = ['fine', 'safe', 'okay', 'home', 'arrived', 'good', 'just walking', 'almost there'];
    
    const isDistress = distressWords.some(word => lowerText.includes(word));
    const isSafe = safeWords.some(word => lowerText.includes(word));
    
    // Simple mock logic
    if (isDistress && !lowerText.includes('not scared')) {
      return 'DISTRESS';
    }
    if (isSafe) {
      return 'SAFE';
    }
    return 'NEUTRAL';
  }

  // Actual Gemini API implementation
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      You are an AI safety assistant. Analyze the following transcript from a user walking alone. 
      Determine if the user is in distress, being coerced, or facing danger.
      Return EXACTLY one word from this list: SAFE, DISTRESS, NEUTRAL.
      Do not include any other text or punctuation.

      Transcript: "${text}"
    `;
    
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim().toUpperCase();
    
    if (['SAFE', 'DISTRESS', 'NEUTRAL'].includes(response)) {
      return response;
    }
    return 'NEUTRAL';
  } catch (error) {
    console.error("AI Analysis error:", error);
    return 'NEUTRAL';
  }
}

module.exports = {
  analyzeDistress
};
