import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, TransactionType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function getSavingsRecommendations(transactions: Transaction[]) {
  if (transactions.length === 0) return "Adicione algumas transações para obter recomendações personalizadas!";

  const summary = transactions.reduce((acc, t) => {
    if (t.type === TransactionType.EXPENSE) {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  const totalExpense = Object.values(summary).reduce((a, b) => a + b, 0);
  
  const prompt = `
    Analise estes gastos mensais e forneça 3-4 recomendações de economia específicas e acionáveis em Português do Brasil.
    
    Gastos:
    ${Object.entries(summary).map(([cat, val]) => `- ${cat}: R$${val.toFixed(2)} (${((val/totalExpense)*100).toFixed(1)}%)`).join('\n')}
    Gasto Total: R$${totalExpense.toFixed(2)}

    Formate cada recomendação como um objeto JSON. Atributos:
    - title: Título curto e chamativo
    - advice: Conselho detalhado com alvo de economia
    - priority: "high", "medium", ou "low"
    
    Responda ESTRITAMENTE em JSON.
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
    console.error("Erro Gemini AI:", error);
    return [];
  }
}
