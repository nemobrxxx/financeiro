import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, TransactionType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function getSavingsRecommendations(transactions: Transaction[]) {
  if (transactions.length === 0) return "Add some transactions to get personalized savings recommendations!";

  const summary = transactions.reduce((acc, t) => {
    if (t.type === TransactionType.EXPENSE) {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  const totalExpense = Object.values(summary).reduce((a, b) => a + b, 0);
  
  const prompt = `
    Analyze these monthly expenses for a personal finance app and provide 3-4 specific, actionable savings recommendations.
    
    Expenses:
    ${Object.entries(summary).map(([cat, val]) => `- ${cat}: $${val.toFixed(2)} (${((val/totalExpense)*100).toFixed(1)}%)`).join('\n')}
    Total Monthly Expense: $${totalExpense.toFixed(2)}

    Format each recommendation as a JSON object within an array. Each object should have:
    - title: A short catchy title
    - advice: Detailed advice including a specific percentage or target if applicable
    - priority: "high", "medium", or "low"
    
    Respond STRICTLY in JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              advice: { type: Type.STRING },
              priority: { type: Type.STRING, enum: ["high", "medium", "low"] }
            },
            required: ["title", "advice", "priority"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini AI error:", error);
    return [];
  }
}
