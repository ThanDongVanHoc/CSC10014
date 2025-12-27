/**
 * js/map/services/medicalService.js
 * Service to handle Medical API requests and simulations
 * Matches flow: App BE -> Service Price
 */

export const MedicalService = {
  // Mock fetching Real-time Stats (Wait Time + Demand)
  // This drives the "Heatmap" visualization
  getRealTimeStats: async (hospitalId) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    // Randomize demand for demo purposes
    const demandScore = Math.random(); 
    let waitTime, demandLabel, colorCode;

    // Logic: Higher demand = Red color, Long wait
    if (demandScore < 0.4) {
      waitTime = Math.floor(Math.random() * 15) + 5; // 5-20 mins
      demandLabel = "Low Load";
      colorCode = "#10b981"; // Green
    } else if (demandScore < 0.7) {
      waitTime = Math.floor(Math.random() * 30) + 20; // 20-50 mins
      demandLabel = "Moderate";
      colorCode = "#f59e0b"; // Orange
    } else {
      waitTime = Math.floor(Math.random() * 60) + 50; // 50+ mins
      demandLabel = "High Demand";
      colorCode = "#ef4444"; // Red
    }

    return {
      hospitalId,
      waitTimeMinutes: waitTime,
      demand: demandLabel,
      colorCode: colorCode,
      distanceKm: (1.2 + Math.random() * 3).toFixed(1), // Mock distance
    };
  },
};