const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("../config/logger");

let geminiClient = null;

const getClient = () => {
  if (!geminiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is not set.");
    }
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return geminiClient;
};

const generateSalesSummary = async (dataText, stats, filename) => {

  const genAI = getClient();
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const model = genAI.getGenerativeModel({
  model: modelName,
});

  const statsText = Object.entries(stats)
    .map(([field, s]) =>
      `${field}: Total=${s.total}, Avg=${s.average}, Min=${s.min}, Max=${s.max}, Count=${s.count}`
    )
    .join("\n");

  const prompt = `
You are a senior business analyst at Rabbitt AI.

Write a concise executive sales report.

Requirements:
- Start with a bold headline
- Highlight top regions/products
- Identify anomalies
- Provide 3-5 actionable recommendations
- Use precise numbers
- Under 500 words
- Format using markdown sections:
  **Overview**
  **Key Highlights**
  **Risk Flags**
  **Recommendations**

FILE: ${filename}

RAW DATA
${dataText}

STATISTICS
${statsText || "No numeric fields detected."}
`;

  logger.info("Calling Gemini API", { model: modelName, filename });

  try {

    const result = await model.generateContent(prompt);
    const response = await result.response;

    const summary = response.text();

    if (!summary) {
      throw new Error("Gemini returned empty response");
    }

    return summary;

  } catch (err) {

    logger.error("Gemini API error", { error: err.message });

    throw new Error(`AI generation failed: ${err.message}`);
  }
};

module.exports = { generateSalesSummary };