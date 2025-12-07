import { GoogleGenAI, Type } from "@google/genai";
import { BattleBird, Weather, Altitude } from '../types';

export interface AITurnResult {
  moveId: string;
  desiredAltitude: Altitude;
  commentary: string;
}

export const getAITurn = async (
  aiBird: BattleBird,
  playerBird: BattleBird,
  turnNumber: number,
  weather: Weather,
  recentLogs: string[]
): Promise<AITurnResult> => {
  try {
    // Initialize inside the function to prevent startup errors
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-2.5-flash';
    
    // Construct the context for the AI
    const availableMovesInfo = aiBird.moves.map(m => 
      `- ${m.id}: "${m.name}" (${m.type}, Cost: ${m.cost}, Power: ${m.power}) - ${m.description} ${m.requiresHeight ? '[REQUIRES HIGH ALT]' : ''}`
    ).join('\n');
    
    const prompt = `
      You are the AI opponent in a tactical bird battle game called "Bird Game 3".
      
      ENVIRONMENT:
      Weather: ${weather} (Tailwind = fast, Storm = low accuracy/high drain)
      
      YOUR CHARACTER:
      Name: ${aiBird.name}
      Species: ${aiBird.species}
      HP: ${aiBird.currentHp} / ${aiBird.baseHp}
      Energy: ${aiBird.currentEnergy} / ${aiBird.baseEnergy}
      Altitude: ${Altitude[aiBird.altitude]} (0=Ground, 1=Low, 2=High)
      
      OPPONENT CHARACTER:
      Name: ${playerBird.name}
      HP: ${playerBird.currentHp} / ${playerBird.baseHp}
      Altitude: ${Altitude[playerBird.altitude]}
      
      BATTLE LOG:
      ${recentLogs.slice(-3).join('\n')}
      
      AVAILABLE MOVES:
      ${availableMovesInfo}
      
      MECHANICS:
      - High Altitude (Soar): Increases Crit & Evasion, but drains Energy. Required for some specials.
      - Ground (Roost): Regenerates extra Energy, but vulnerable.
      - Height Advantage: Attacking from higher up deals bonus damage.
      
      STRATEGY:
      1. Manage Energy carefully. If low, drop to Ground/Roost to recharge.
      2. If you have a move that requires Height, fly UP first.
      3. If opponent is High and you are Low, consider matching altitude or defending.
      
      OUTPUT JSON:
      {
        "moveId": "string (id of move)",
        "desiredAltitude": number (0, 1, or 2 - the altitude you want to be at BEFORE attacking),
        "commentary": "short tactical line"
      }
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            moveId: { type: Type.STRING },
            desiredAltitude: { type: Type.INTEGER },
            commentary: { type: Type.STRING }
          },
          required: ["moveId", "desiredAltitude", "commentary"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const result = JSON.parse(text);
    
    // Validation fallback
    const validAltitude = [0, 1, 2].includes(result.desiredAltitude) ? result.desiredAltitude : aiBird.altitude;
    
    return {
        moveId: result.moveId,
        desiredAltitude: validAltitude,
        commentary: result.commentary
    };

  } catch (error) {
    console.error("Gemini AI Error:", error);
    return {
      moveId: aiBird.moves[0].id,
      desiredAltitude: aiBird.altitude,
      commentary: "*Aggressive screeches*"
    };
  }
};