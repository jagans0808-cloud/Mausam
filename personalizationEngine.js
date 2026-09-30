/**
 * ============================================================================
 * MAUSAM - PERSONALIZATION ENGINE (PHASE 2)
 * File: personalizationEngine.js
 * 
 * Description:
 * Rule-based meteorological personalization layer.
 * Evaluates weather values against domain-specific thresholds to generate
 * tailored metrics, actionable recommendations, and priority alerts for
 * each of the 8 user personas (Health, Fitness, Travel, Beach, Family,
 * Agriculture, Commuter, Event Planner).
 * 
 * Architecture Note:
 * This logic is decoupled from DOM manipulation, allowing easy expansion
 * and future API / ML integration in later phases.
 * ============================================================================
 */

const PersonalizationEngine = {

  /**
   * Helper to format temperature according to active unit (C or F)
   */
  formatTempVal(celsius, unit = "C") {
    if (celsius === null || celsius === undefined || isNaN(celsius)) return "--";
    if (unit === "F") {
      return Math.round((Number(celsius) * 9) / 5 + 32);
    }
    return Math.round(Number(celsius));
  },

  /**
   * Evaluates whether any severe weather conditions exist in the current weather data.
   * If detected, returns a priority alert payload to display at the top of the dashboard.
   */
  evaluateSevereWeatherAlert(weatherData, tempUnit = "C") {
    // 1. Explicit severe flag in data
    if (weatherData.severeWeather && weatherData.severeWeather.isSevere) {
      return {
        hasAlert: true,
        type: weatherData.severeWeather.type || "Severe Weather Warning",
        level: weatherData.severeWeather.severity || "Critical", // 'Critical', 'Warning', 'Advisory'
        badgeClass: "alert-severe-critical",
        title: weatherData.severeWeather.title || "Severe Weather Alert",
        description: weatherData.severeWeather.description,
        instruction: weatherData.severeWeather.instruction || "Take necessary precautions and limit exposure."
      };
    }

    // 2. Rule-based threshold evaluation: Extreme AQI (> 250)
    if (weatherData.aqi >= 250) {
      return {
        hasAlert: true,
        type: "Air Quality Hazard",
        level: "Severe",
        badgeClass: "alert-severe-critical",
        title: "Severe Atmospheric Hazard Warning",
        description: `Hazardous AQI level (${weatherData.aqi}) detected. Particulate matter PM2.5 is at dangerous thresholds.`,
        instruction: "Wear N95/FFP2 masks outdoors; sensitive groups and children must remain indoors."
      };
    }

    // 3. Rule-based threshold evaluation: Extreme Wind / Squall (> 40 km/h)
    if (weatherData.windSpeed >= 40) {
      return {
        hasAlert: true,
        type: "High Wind / Gale Warning",
        level: "Warning",
        badgeClass: "alert-severe-warning",
        title: `High Wind Warning (${weatherData.windSpeed} km/h)`,
        description: "Strong localized gusts may cause temporary disruption, flying debris, and rough coastal seas.",
        instruction: "Secure temporary outdoor structures, loose scaffolding, and avoid open waterways."
      };
    }

    // 4. Rule-based threshold evaluation: Extreme Heat (> 40°C)
    if (weatherData.temp >= 40) {
      return {
        hasAlert: true,
        type: "Heatwave Alert",
        level: "Warning",
        badgeClass: "alert-severe-warning",
        title: `Severe Heatwave Alert (${this.formatTempVal(weatherData.temp, tempUnit)}°${tempUnit})`,
        description: "Extreme surface temperatures increase the risk of heat hyperthermia and dehydration.",
        instruction: "Avoid direct sunlight exposure between 12:00 PM and 4:00 PM. Hydrate continuously."
      };
    }

    // 5. Heavy Precipitation (> 70% Rain Chance with Thunderstorm)
    if (weatherData.rainChance >= 70 && weatherData.conditionCode === "cloud-rain") {
      return {
        hasAlert: true,
        type: "Heavy Rain & Waterlogging Watch",
        level: "Advisory",
        badgeClass: "alert-severe-advisory",
        title: "Heavy Convective Showers Anticipated",
        description: "Persistent tropical showers likely to cause local urban waterlogging and low visibility.",
        instruction: "Expect traffic delays and slippery road surfaces. Keep storm drains clear."
      };
    }

    // No severe weather detected
    return {
      hasAlert: false
    };
  },

  /**
   * Generates tailored metrics and recommendations for the HEALTH profile.
   * Focus: AQI, PM2.5/PM10, Pollen Count, UV Index, Humidity, Respiratory advice.
   */
  generateHealthProfile(weatherData) {
    const aqi = weatherData.aqi || 50;
    const uv = weatherData.uvIndex || 5;
    const humidity = weatherData.humidity || 50;
    const pollen = weatherData.pollen || { count: "Low", tree: "Low", grass: "Low", weed: "Low" };

    // Rule-based Recommendation
    let recommendation = "";
    let riskLevel = "Low Risk";
    let riskColor = "#10b981";

    if (aqi > 200) {
      riskLevel = "High Health Risk";
      riskColor = "#ef4444";
      recommendation = "Severe pollution detected. Keep windows shut, operate HEPA air purifiers, and wear an N95 respirator mask outdoors.";
    } else if (aqi > 100) {
      riskLevel = "Moderate Vulnerability";
      riskColor = "#f59e0b";
      recommendation = "Air quality is moderately polluted. Sensitive individuals with asthma or COPD should limit prolonged outdoor exertion.";
    } else if (pollen.count === "High" || pollen.count === "Very High") {
      riskLevel = "Allergy Advisory";
      riskColor = "#f59e0b";
      recommendation = "High airborne pollen levels detected. Consider taking prescribed antihistamines and wear sunglasses to prevent eye irritation.";
    } else {
      recommendation = "Atmospheric conditions are optimal. Safe for all outdoor activities and natural home ventilation.";
    }

    // Domain Metrics to display
    const metrics = [
      {
        label: "Air Quality Index",
        value: `${aqi}`,
        unit: "AQI",
        status: weatherData.aqiStatus || "Moderate",
        icon: "fa-lungs",
        highlightColor: riskColor
      },
      {
        label: "Airborne Pollen Index",
        value: pollen.count,
        unit: "",
        status: `Tree: ${pollen.tree} | Grass: ${pollen.grass}`,
        icon: "fa-seedling",
        highlightColor: pollen.count === "High" ? "#f59e0b" : "#38bdf8"
      },
      {
        label: "UV Radiation Index",
        value: `${uv}`,
        unit: "/ 11",
        status: weatherData.uvStatus || "Moderate",
        icon: "fa-sun",
        highlightColor: uv >= 8 ? "#ef4444" : "#38bdf8"
      },
      {
        label: "Atmospheric Humidity",
        value: `${humidity}%`,
        unit: "",
        status: humidity > 70 ? "High (Mucosal Stress)" : "Comfortable",
        icon: "fa-droplet",
        highlightColor: "#38bdf8"
      }
    ];

    const actionableTips = [
      aqi > 100 ? "Wear an N95 mask if outdoors for more than 20 minutes" : "Outdoor air quality is safe for normal breathing",
      uv >= 6 ? "Apply broad-spectrum SPF 30+ sunscreen and wear UV-blocking eyewear" : "Minimal UV protection required today",
      humidity > 70 ? "High humidity may trigger mold allergens in closed indoor rooms" : "Maintain optimal indoor moisture levels between 40%-60%"
    ];

    return {
      personaName: "Health",
      riskLevel,
      riskColor,
      recommendation,
      metrics,
      actionableTips,
      extraSectionTitle: "Allergen & Respiratory Breakdown",
      extraSectionData: [
        { name: "Tree Pollen", level: pollen.tree || "Low" },
        { name: "Grass Pollen", level: pollen.grass || "Low" },
        { name: "Weed Pollen", level: pollen.weed || "Low" },
        { name: "Mold Spore Index", level: humidity > 75 ? "Moderate" : "Low" }
      ]
    };
  },

  /**
   * Generates tailored metrics and recommendations for the FITNESS profile.
   * Focus: Temperature, Wind Speed, UV Index, Sunrise/Sunset, Best Outdoor Running Window.
   */
  generateFitnessProfile(weatherData, tempUnit = "C") {
    const temp = weatherData.temp || 25;
    const humidity = weatherData.humidity || 50;
    const windSpeed = weatherData.windSpeed || 10;
    const uv = weatherData.uvIndex || 5;

    // Rule-based Workout Window & Hydration Calculation
    let bestWindow = "06:00 AM - 08:30 AM";
    let workoutScore = "9.0 / 10";
    let recommendation = "";
    let statusBadge = "Optimal Window";

    if (temp >= 34 || (temp >= 30 && humidity >= 70)) {
      bestWindow = "05:30 AM - 07:00 AM or Post 07:00 PM";
      workoutScore = "5.5 / 10";
      statusBadge = "Heat Stress Warning";
      recommendation = "High thermal load detected during mid-day. Shift outdoor runs to the early dawn or switch to an indoor air-conditioned workout.";
    } else if (weatherData.rainChance >= 60) {
      bestWindow = "Check hourly radar before training";
      workoutScore = "6.0 / 10";
      statusBadge = "Wet Pavement Alert";
      recommendation = "High precipitation chance. Wear trail shoes with enhanced wet-grip traction or perform indoor strength training.";
    } else if (temp < 15) {
      bestWindow = "10:00 AM - 04:00 PM";
      workoutScore = "8.5 / 10";
      statusBadge = "Cool & Crisp";
      recommendation = "Chilly conditions. Warm up for at least 10 minutes to protect hamstring and knee joints before speed work.";
    } else {
      recommendation = "Ideal meteorological conditions for outdoor distance runs, cycling, and HIIT training.";
    }

    const hydrationRequirement = temp >= 30 ? "750 ml per 45 mins" : "400-500 ml per hour";

    const metrics = [
      {
        label: "Ambient Temperature",
        value: `${this.formatTempVal(temp, tempUnit)}°${tempUnit}`,
        unit: "",
        status: `Feels like ${this.formatTempVal(weatherData.feelsLike, tempUnit)}°${tempUnit}`,
        icon: "fa-temperature-half",
        highlightColor: temp > 32 ? "#ef4444" : "#10b981"
      },
      {
        label: "Wind Velocity",
        value: `${windSpeed}`,
        unit: "km/h",
        status: `Direction: ${weatherData.windDir || "Calm"}`,
        icon: "fa-wind",
        highlightColor: "#38bdf8"
      },
      {
        label: "UV Solar Intensity",
        value: `${uv}`,
        unit: "/ 11",
        status: weatherData.uvStatus || "Moderate",
        icon: "fa-sun",
        highlightColor: uv >= 8 ? "#f59e0b" : "#38bdf8"
      },
      {
        label: "Hydration Demand",
        value: hydrationRequirement,
        unit: "",
        status: "Electrolyte replacement advised",
        icon: "fa-bottle-water",
        highlightColor: "#10b981"
      }
    ];

    const actionableTips = [
      `Prime outdoor running window: ${bestWindow}`,
      `Sunrise: ${weatherData.sunrise || "06:15 AM"} | Sunset: ${weatherData.sunset || "06:20 PM"}`,
      `Electrolyte & Water Target: ${hydrationRequirement}`
    ];

    return {
      personaName: "Fitness",
      riskLevel: statusBadge,
      riskColor: "#10b981",
      recommendation,
      metrics,
      actionableTips,
      extraSectionTitle: "Training Intel & Outdoor Rating",
      extraSectionData: [
        { name: "Running Condition Score", level: workoutScore },
        { name: "Thermal Exertion Index", level: temp > 30 ? "Elevated" : "Normal" },
        { name: "Aerobic Friction (Wind)", level: windSpeed > 20 ? "Resistance Present" : "Low Resistance" },
        { name: "Optimal Session Timing", level: bestWindow }
      ]
    };
  },

  /**
   * Generates tailored metrics and recommendations for the TRAVEL profile.
   * Focus: Destination weather, Rain probability, Severe weather status, Packing guidance.
   */
  generateTravelProfile(weatherData, tempUnit = "C") {
    const rainChance = weatherData.rainChance || 10;
    const temp = weatherData.temp || 28;
    const visibility = weatherData.visibility || 6.0;

    // Rule-based Packing & Travel Recommendation
    let packingAdvice = [];
    let recommendation = "";
    let travelStatus = "Smooth Travel Conditions";

    if (rainChance >= 50) {
      travelStatus = "Rain Transit Caution";
      recommendation = "High rain probability at destination. Expect potential transit slowdowns and wet pavement across arterial highways.";
      packingAdvice = ["Waterproof jacket / umbrella", "Quick-dry synthetic clothing", "Water-resistant footwear", "Waterproof electronic sleeves"];
    } else if (temp >= 32) {
      recommendation = "Warm tropical sunshine expected. Excellent for sightseeing; plan indoor museum visits during peak mid-afternoon heat.";
      packingAdvice = ["Lightweight breathable cottons", "UV-protective sunglasses & hat", "High-SPF sunscreen", "Portable insulated water bottle"];
    } else if (temp <= 16) {
      recommendation = "Cool mountain/autumn temperatures. Ideal for outdoor excursions and walking tours with appropriate thermal layering.";
      packingAdvice = ["Medium fleece / insulated jacket", "Thermal innerwear for evenings", "Comfortable walking boots", "Lip balm & moisturizer"];
    } else {
      recommendation = "Clear skies and moderate temperatures make this an exceptional day for sightseeing and inter-city commutes.";
      packingAdvice = ["Casual all-weather attire", "Light evening cardigan", "Comfortable travel shoes", "Camera for golden hour sights"];
    }

    const metrics = [
      {
        label: "Destination Weather",
        value: `${this.formatTempVal(temp, tempUnit)}°${tempUnit}`,
        unit: "",
        status: weatherData.condition || "Clear",
        icon: "fa-location-dot",
        highlightColor: "#38bdf8"
      },
      {
        label: "Precipitation Probability",
        value: `${rainChance}%`,
        unit: "",
        status: rainChance > 40 ? "Rain Gear Essential" : "Dry Skies Expected",
        icon: "fa-cloud-showers-heavy",
        highlightColor: rainChance > 40 ? "#f59e0b" : "#10b981"
      },
      {
        label: "Transit Visibility",
        value: `${visibility}`,
        unit: "km",
        status: visibility >= 6 ? "Clear Road & Airway Range" : "Caution (Hazy / Fog)",
        icon: "fa-eye",
        highlightColor: visibility >= 6 ? "#10b981" : "#f59e0b"
      },
      {
        label: "Severe Weather Flag",
        value: weatherData.severeWeather?.isSevere ? "Active Warning" : "None",
        unit: "",
        status: weatherData.severeWeather?.isSevere ? weatherData.severeWeather.type : "Normal Atmospheric Transit",
        icon: "fa-shield-halved",
        highlightColor: weatherData.severeWeather?.isSevere ? "#ef4444" : "#10b981"
      }
    ];

    return {
      personaName: "Travel",
      riskLevel: travelStatus,
      riskColor: "#3b82f6",
      recommendation,
      metrics,
      actionableTips: packingAdvice.map((item) => `Packing Tip: ${item}`),
      extraSectionTitle: "Smart Luggage & Transit Checklist",
      extraSectionData: packingAdvice.map((item) => ({ name: "Recommended Item", level: item }))
    };
  },

  /**
   * Generates tailored metrics and recommendations for the BEACH profile.
   * Focus: Sea conditions, Tide timing, Wave height, Water temperature, Swimming safety.
   */
  generateBeachProfile(weatherData, tempUnit = "C") {
    const waveHeight = weatherData.waveHeight || 1.2;
    const waterTemp = weatherData.waterTemp || 26;
    const tideTiming = weatherData.tideTiming || { highTide: "02:15 PM (1.8m)", lowTide: "08:45 AM (0.5m)" };
    const uv = weatherData.uvIndex || 7;
    const windSpeed = weatherData.windSpeed || 15;

    // Rule-based Swimming & Marine Safety
    let seaCondition = weatherData.seaCondition || "Moderate Swell";
    let swimSafety = "Safe with Caution";
    let recommendation = "";

    if (waveHeight >= 2.0 || windSpeed >= 30) {
      swimSafety = "Hazardous Surf — Red Flag";
      recommendation = "Strong shorebreak waves and gusty onshore winds detected. Recreational swimming is discouraged. Avoid wading near rip currents.";
    } else if (uv >= 8) {
      swimSafety = "Ideal Waters — High UV Risk";
      recommendation = "Calm to moderate sea conditions with warm water. Sun radiation is extreme between 11:00 AM and 3:30 PM; reapply sunscreen hourly.";
    } else {
      swimSafety = "Safe for Swimming & Watersports";
      recommendation = "Favorable coastal weather with gentle tides and comfortable water temperature. Great day for swimming, paddle-boarding, or beach walks.";
    }

    const metrics = [
      {
        label: "Sea & Surf State",
        value: seaCondition,
        unit: "",
        status: `Wave Height: ${waveHeight} m`,
        icon: "fa-water",
        highlightColor: waveHeight > 1.8 ? "#ef4444" : "#06b6d4"
      },
      {
        label: "Tide Schedule",
        value: "High: " + tideTiming.highTide.split(" ")[0],
        unit: "",
        status: `Low Tide: ${tideTiming.lowTide}`,
        icon: "fa-arrows-up-down",
        highlightColor: "#06b6d4"
      },
      {
        label: "Water Temperature",
        value: `${this.formatTempVal(waterTemp, tempUnit)}°${tempUnit}`,
        unit: "",
        status: "Pleasant Coastal Bathing",
        icon: "fa-temperature-arrow-up",
        highlightColor: "#10b981"
      },
      {
        label: "Coastal UV Index",
        value: `${uv}`,
        unit: "/ 11",
        status: weatherData.uvStatus || "High",
        icon: "fa-sun",
        highlightColor: uv >= 8 ? "#f59e0b" : "#38bdf8"
      }
    ];

    const actionableTips = [
      `High Tide Timeline: ${tideTiming.highTide} | Low Tide: ${tideTiming.lowTide}`,
      `Surf Safety Status: ${swimSafety}`,
      "Water reflection doubles UV exposure; reapply SPF 50+ after emerging from water"
    ];

    return {
      personaName: "Beach",
      riskLevel: swimSafety,
      riskColor: "#06b6d4",
      recommendation,
      metrics,
      actionableTips,
      extraSectionTitle: "Coastal Marine Intelligence",
      extraSectionData: [
        { name: "Wave Swell Height", level: `${waveHeight} meters` },
        { name: "High Tide Prediction", level: tideTiming.highTide },
        { name: "Low Tide Prediction", level: tideTiming.lowTide },
        { name: "Coastal Wind Drift", level: `${windSpeed} km/h (${weatherData.windDir || "Offshore"})` }
      ]
    };
  },

  /**
   * Generates tailored metrics and recommendations for the FAMILY profile.
   * Focus: School/commute weather, Rain alert, Outdoor playground rating, Family outing advisory.
   */
  generateFamilyProfile(weatherData) {
    const temp = weatherData.temp || 26;
    const rainChance = weatherData.rainChance || 15;
    const aqi = weatherData.aqi || 60;
    const uv = weatherData.uvIndex || 6;

    // Rule-based Family & Child Safety Evaluation
    let parkRating = "8.5 / 10 (Great for Outings)";
    let recommendation = "";
    let statusBadge = "Safe Family Outing";

    if (rainChance >= 50) {
      parkRating = "4.0 / 10 (Indoor Recommended)";
      statusBadge = "Rain Expected";
      recommendation = "Passing rain showers predicted for this afternoon. Consider indoor activities such as children's museums, science centers, or home games.";
    } else if (aqi > 150) {
      parkRating = "3.5 / 10 (Pollution Advisory)";
      statusBadge = "Poor Air for Children";
      recommendation = "Elevated particulate pollution detected. Children's sensitive respiratory tracts should not be exposed to prolonged vigorous outdoor play.";
    } else if (temp > 33) {
      parkRating = "6.0 / 10 (Warm Afternoon)";
      statusBadge = "Late Afternoon Best";
      recommendation = "Mid-day heat is intense for toddlers and elderly family members. Best playground and park time is after 4:30 PM as the sun begins to set.";
    } else {
      recommendation = "Pleasant weather with mild temperatures and clean air. Excellent day for a weekend picnic, zoo visit, or community park games.";
    }

    const schoolMorningStatus = temp < 18 ? "Chilly Morning (Light Jacket)" : (rainChance > 40 ? "Carry Umbrella in Schoolbag" : "Clear Morning Walk");

    const metrics = [
      {
        label: "Park & Play Score",
        value: parkRating.split(" ")[0],
        unit: "",
        status: statusBadge,
        icon: "fa-children",
        highlightColor: parkRating.startsWith("8") ? "#10b981" : "#f59e0b"
      },
      {
        label: "School Commute Weather",
        value: schoolMorningStatus.split(" (")[0],
        unit: "",
        status: schoolMorningStatus,
        icon: "fa-school",
        highlightColor: "#8b5cf6"
      },
      {
        label: "Rain Probability",
        value: `${rainChance}%`,
        unit: "",
        status: rainChance > 40 ? "Rain Shield Required" : "Dry Afternoon",
        icon: "fa-cloud-rain",
        highlightColor: rainChance > 40 ? "#f59e0b" : "#10b981"
      },
      {
        label: "Child Air Safety (AQI)",
        value: `${aqi}`,
        unit: "AQI",
        status: weatherData.aqiStatus || "Moderate",
        icon: "fa-shield-heart",
        highlightColor: aqi > 120 ? "#ef4444" : "#10b981"
      }
    ];

    const actionableTips = [
      "Optimal family playground hours: 4:30 PM – 6:30 PM",
      "Pack insulated water bottles and natural mosquito repellent for evening park visits",
      `School bag check: ${rainChance > 40 ? "Pack compact umbrella & rain cover" : "Standard water bottle & sun hat"}`
    ];

    return {
      personaName: "Family",
      riskLevel: statusBadge,
      riskColor: "#8b5cf6",
      recommendation,
      metrics,
      actionableTips,
      extraSectionTitle: "Family Activity Feasibility",
      extraSectionData: [
        { name: "Outdoor Playground Index", level: parkRating },
        { name: "Morning School Commute", level: schoolMorningStatus },
        { name: "Mosquito / Sunset Risk", level: weatherData.humidity > 70 ? "Moderate (Use Repellent)" : "Low" },
        { name: "Elderly Thermal Comfort", level: temp > 32 ? "Caution (Stay in shade)" : "Comfortable" }
      ]
    };
  },

  /**
   * Generates tailored metrics and recommendations for the AGRICULTURE profile.
   * Focus: Rainfall information, Soil moisture, Frost status, Spraying and planting guidance.
   */
  generateAgricultureProfile(weatherData, tempUnit = "C") {
    const rainChance = weatherData.rainChance || 10;
    const soilMoisture = weatherData.soilMoisture || 62;
    const frostStatus = weatherData.frostStatus || "No Frost Risk";
    const windSpeed = weatherData.windSpeed || 12;
    const humidity = weatherData.humidity || 55;

    // Rule-based Agricultural Guidance
    let sprayCondition = "Optimal Spraying Window";
    let recommendation = "";
    let irrigationNeed = "Moderate Drip Irrigation";

    if (windSpeed > 20) {
      sprayCondition = "Unsafe for Chemical Spraying (Drift Hazard)";
      recommendation = "High wind gusts exceed 20 km/h. Postpone foliar nutrient sprays and pesticide applications to prevent chemical drift.";
    } else if (rainChance > 60) {
      sprayCondition = "Delay Spraying (Washoff Risk)";
      irrigationNeed = "Halt Irrigation (Rain Expected)";
      recommendation = "Heavy precipitation anticipated. Suspend supplemental irrigation to prevent root waterlogging and nutrient runoff.";
    } else if (soilMoisture < 45) {
      irrigationNeed = "Urgent Irrigation Required";
      recommendation = "Soil moisture is critically low. Initiate morning drip irrigation to avoid crop wilting and moisture deficit stress.";
    } else {
      recommendation = "Favorable agro-meteorological conditions. Low wind drift allows safe foliar spraying; soil moisture supports active root growth.";
    }

    const metrics = [
      {
        label: "Soil Moisture Level",
        value: `${soilMoisture}%`,
        unit: "",
        status: weatherData.soilMoistureStatus || (soilMoisture > 50 ? "Adequate Root Moisture" : "Low Moisture"),
        icon: "fa-droplet-slash",
        highlightColor: soilMoisture < 45 ? "#ef4444" : "#84cc16"
      },
      {
        label: "Precipitation Outlook",
        value: `${rainChance}%`,
        unit: "",
        status: weatherData.rainfallStatus || "Seasonal Normal",
        icon: "fa-cloud-meatball",
        highlightColor: "#84cc16"
      },
      {
        label: "Frost & Cold Stress",
        value: frostStatus,
        unit: "",
        status: `Min Temp: ${this.formatTempVal(weatherData.lowTemp || 18, tempUnit)}°${tempUnit}`,
        icon: "fa-snowflake",
        highlightColor: frostStatus.includes("Risk") ? "#ef4444" : "#10b981"
      },
      {
        label: "Foliar Spray Advisory",
        value: sprayCondition.split(" (")[0],
        unit: "",
        status: `Wind: ${windSpeed} km/h (Drift Index)`,
        icon: "fa-spray-can",
        highlightColor: sprayCondition.startsWith("Optimal") ? "#10b981" : "#f59e0b"
      }
    ];

    const actionableTips = [
      `Spraying Advisory: ${sprayCondition}`,
      `Irrigation Schedule: ${irrigationNeed}`,
      `Soil Health: Maintain topsoil mulch to conserve ${soilMoisture}% current moisture retention`
    ];

    return {
      personaName: "Agriculture",
      riskLevel: "Agro-Advisory Active",
      riskColor: "#84cc16",
      recommendation,
      metrics,
      actionableTips,
      extraSectionTitle: "Crop Management & Field Guidance",
      extraSectionData: [
        { name: "Field Spraying Window", level: sprayCondition },
        { name: "Irrigation Regulation", level: irrigationNeed },
        { name: "Frost Stress Hazard", level: frostStatus },
        { name: "Dew Point & Fungal Risk", level: `Dew Point: ${this.formatTempVal(Math.round((weatherData.temp || 28) - (100 - humidity) / 5), tempUnit)}°${tempUnit} (Low Fungal Spread)` }
      ]
    };
  },

  /**
   * Generates tailored metrics and recommendations for the COMMUTER profile.
   * Focus: Temperature, Visibility, Rain Condition, Storm/Fog alert, Commute recommendation.
   */
  generateCommuterProfile(weatherData, tempUnit = "C") {
    const visibility = weatherData.visibility || 5.2;
    const rainChance = weatherData.rainChance || 15;
    const windSpeed = weatherData.windSpeed || 14;
    const temp = weatherData.temp || 28;

    // Rule-based Commute & Traffic Advisory
    let roadCondition = "Clear & Dry Highways";
    let recommendation = "";
    let commuteRisk = "Normal Transit Speed";

    if (visibility < 3.0) {
      roadCondition = "Dense Fog / Severe Haze Warning";
      commuteRisk = "Reduced Speed Mandatory";
      recommendation = "Critical low visibility on arterial ring roads and expressways. Turn on low-beam headlights/fog lamps and increase braking distance.";
    } else if (rainChance > 50) {
      roadCondition = "Wet Pavement & Waterlogging Risk";
      commuteRisk = "Expect 15-25 min Traffic Delays";
      recommendation = "Rain showers will cause slick road surfaces and localized junction waterlogging. Plan for an earlier departure during evening peak hours.";
    } else {
      recommendation = "Optimal commuting weather across all major road, metro, and rail transit corridors with no weather-induced delays.";
    }

    const metrics = [
      {
        label: "Roadway Visibility",
        value: `${visibility}`,
        unit: "km",
        status: visibility >= 5 ? "Normal Visual Field" : "Fog Hazard Warning",
        icon: "fa-road",
        highlightColor: visibility >= 5 ? "#10b981" : "#ef4444"
      },
      {
        label: "Rush Hour Rain Risk",
        value: `${rainChance}%`,
        unit: "",
        status: rainChance > 40 ? "Waterlogging Watch" : "Dry Corridors",
        icon: "fa-cloud-rain",
        highlightColor: rainChance > 40 ? "#f59e0b" : "#10b981"
      },
      {
        label: "Transit Thermal Index",
        value: `${this.formatTempVal(temp, tempUnit)}°${tempUnit}`,
        unit: "",
        status: `Feels like ${this.formatTempVal(weatherData.feelsLike || temp, tempUnit)}°${tempUnit}`,
        icon: "fa-car",
        highlightColor: "#f59e0b"
      },
      {
        label: "Commute Delay Index",
        value: commuteRisk.split(" ")[0],
        unit: "",
        status: commuteRisk,
        icon: "fa-traffic-light",
        highlightColor: commuteRisk.startsWith("Normal") ? "#10b981" : "#f59e0b"
      }
    ];

    const actionableTips = [
      "Morning rush hour (08:00 – 10:30 AM): Dry pavement and clear transit flow",
      "Evening rush hour (05:30 – 08:30 PM): Mild breeze, visibility > 5 km",
      "Maintain safe following distance and keep vehicle wipers and defoggers functional"
    ];

    return {
      personaName: "Commuter",
      riskLevel: roadCondition,
      riskColor: "#f59e0b",
      recommendation,
      metrics,
      actionableTips,
      extraSectionTitle: "Transit Route & Traffic Conditions",
      extraSectionData: [
        { name: "Expressway Fog Level", level: visibility < 4 ? "Caution Required" : "Clear" },
        { name: "Waterlogging Vulnerability", level: rainChance > 50 ? "Low-Lying Areas At Risk" : "Zero Risk" },
        { name: "Public Transit Feasibility", level: "Metro & Bus On Normal Schedule" },
        { name: "Two-Wheeler Caution", level: rainChance > 40 ? "Wear Waterproof Rain Gear" : "Safe Riding Conditions" }
      ]
    };
  },

  /**
   * Generates tailored metrics and recommendations for the EVENT PLANNER profile.
   * Focus: Extended weather, Rain probability, Wind gusts, Comfort index, Canopy safety.
   */
  generateEventPlannerProfile(weatherData, tempUnit = "C") {
    const rainChance = weatherData.rainChance || 10;
    const windSpeed = weatherData.windSpeed || 14;
    const windGustMax = weatherData.windGustMax || Math.round(windSpeed * 1.45);
    const temp = weatherData.temp || 28;
    const humidity = weatherData.humidity || 54;

    // Rule-based Event Feasibility
    let canopySafety = "Optimal Anchor Safety";
    let thermalComfort = "Pleasantly Warm";
    let recommendation = "";

    if (windGustMax >= 35) {
      canopySafety = "Structural Caution (High Gusts)";
      recommendation = "Peak wind gusts exceed 35 km/h. Double-anchor outdoor marquee canopies, secure stage backdrops, and test sound rig stability.";
    } else if (rainChance >= 45) {
      canopySafety = "Waterproof Tenting Required";
      recommendation = "Moderate precipitation risk during event hours. Prepare covered walkways, waterproof power distribution units, and backup indoor space.";
    } else {
      recommendation = "Excellent meteorological outlook for open-air banquets, stages, weddings, and public gatherings with low gust risk.";
    }

    if (temp > 32 && humidity > 65) {
      thermalComfort = "Humid & Sticky (Provide Cooling Fans)";
    } else if (temp < 18) {
      thermalComfort = "Chilly (Provide Patio Heaters)";
    } else {
      thermalComfort = "Optimal Guest Comfort";
    }

    const metrics = [
      {
        label: "Peak Wind Gust Risk",
        value: `${windGustMax}`,
        unit: "km/h",
        status: canopySafety,
        icon: "fa-wind",
        highlightColor: windGustMax > 30 ? "#f59e0b" : "#ec4899"
      },
      {
        label: "Event Rain Probability",
        value: `${rainChance}%`,
        unit: "",
        status: rainChance > 30 ? "Covered Backup Needed" : "Zero Precipitation Risk",
        icon: "fa-cloud-showers-water",
        highlightColor: rainChance > 30 ? "#f59e0b" : "#10b981"
      },
      {
        label: "Guest Thermal Comfort",
        value: thermalComfort.split(" (")[0],
        unit: "",
        status: `Ambient: ${this.formatTempVal(temp, tempUnit)}°${tempUnit} | Humidity: ${humidity}%`,
        icon: "fa-champagne-glasses",
        highlightColor: "#ec4899"
      },
      {
        label: "Golden Hour Photo Time",
        value: "05:45 PM",
        unit: "IST",
        status: `Sunset scheduled at ${weatherData.sunset || "06:22 PM"}`,
        icon: "fa-camera",
        highlightColor: "#f59e0b"
      }
    ];

    const actionableTips = [
      "Canopy & Stage Rigging: Anchors verified within safe wind limits (< 25 km/h)",
      "Outdoor lighting & photography: Golden hour peak is 05:45 PM – 06:15 PM",
      `Guest Comfort: ${temp > 30 ? "Deploy outdoor misting fans or shaded zones" : "Temperature is pleasant for outdoor seating"}`
    ];

    return {
      personaName: "Event Planner",
      riskLevel: canopySafety,
      riskColor: "#ec4899",
      recommendation,
      metrics,
      actionableTips,
      extraSectionTitle: "Event Logistics & Production Intel",
      extraSectionData: [
        { name: "Canopy & Marquee Stability", level: canopySafety },
        { name: "Acoustic Wind Interference", level: windSpeed > 18 ? "Moderate (Use Foam Windscreens)" : "Minimal" },
        { name: "Power Equipment Moisture Risk", level: rainChance > 40 ? "Elevated (Elevate DB Boxes)" : "Safe" },
        { name: "Golden Hour Sunlight Window", level: "05:45 PM – 06:15 PM" }
      ]
    };
  },

  /**
   * Main Dispatcher: Evaluates the active profile and returns the complete personalized payload.
   */
  getPersonalizedDashboardData(profileId, weatherData, tempUnit = "C") {
    // 1. Severe Weather Alert Evaluation (universal across all profiles)
    const severeAlert = this.evaluateSevereWeatherAlert(weatherData, tempUnit);

    // 2. Profile-specific personalization
    let profileData;
    switch (profileId) {
      case "health":
        profileData = this.generateHealthProfile(weatherData, tempUnit);
        break;
      case "fitness":
        profileData = this.generateFitnessProfile(weatherData, tempUnit);
        break;
      case "travel":
        profileData = this.generateTravelProfile(weatherData, tempUnit);
        break;
      case "beach":
        profileData = this.generateBeachProfile(weatherData, tempUnit);
        break;
      case "family":
        profileData = this.generateFamilyProfile(weatherData, tempUnit);
        break;
      case "agriculture":
        profileData = this.generateAgricultureProfile(weatherData, tempUnit);
        break;
      case "commuter":
        profileData = this.generateCommuterProfile(weatherData, tempUnit);
        break;
      case "event_planner":
        profileData = this.generateEventPlannerProfile(weatherData, tempUnit);
        break;
      default:
        profileData = this.generateHealthProfile(weatherData, tempUnit);
        break;
    }

    return {
      severeAlert,
      profileData
    };
  },

  /**
   * Translates WMO Weather Code to human text and icon code
   */
  wmoCodeToCondition(code, isDay = 1) {
    const table = {
      0: { condition: isDay ? "Clear Sky" : "Clear Night", icon: isDay ? "sun" : "moon", code: isDay ? "sun" : "moon" },
      1: { condition: "Mainly Clear", icon: isDay ? "sun" : "moon", code: isDay ? "sun" : "moon" },
      2: { condition: "Partly Cloudy", icon: isDay ? "cloud-sun" : "cloud-moon", code: "partly-cloudy" },
      3: { condition: "Overcast", icon: "cloud", code: "cloud" },
      45: { condition: "Foggy", icon: "cloud", code: "cloud" },
      48: { condition: "Depositing Rime Fog", icon: "cloud", code: "cloud" },
      51: { condition: "Light Drizzle", icon: "cloud-drizzle", code: "cloud-rain" },
      53: { condition: "Moderate Drizzle", icon: "cloud-drizzle", code: "cloud-rain" },
      55: { condition: "Dense Drizzle", icon: "cloud-drizzle", code: "cloud-rain" },
      56: { condition: "Light Freezing Drizzle", icon: "cloud-rain", code: "cloud-rain" },
      57: { condition: "Dense Freezing Drizzle", icon: "cloud-rain", code: "cloud-rain" },
      61: { condition: "Slight Rain", icon: "cloud-rain", code: "cloud-rain" },
      63: { condition: "Moderate Rain", icon: "cloud-rain", code: "cloud-rain" },
      65: { condition: "Heavy Rain", icon: "cloud-rain", code: "cloud-rain" },
      66: { condition: "Light Freezing Rain", icon: "cloud-rain", code: "cloud-rain" },
      67: { condition: "Heavy Freezing Rain", icon: "cloud-rain", code: "cloud-rain" },
      71: { condition: "Slight Snow Fall", icon: "snowflake", code: "cloud" },
      73: { condition: "Moderate Snow Fall", icon: "snowflake", code: "cloud" },
      75: { condition: "Heavy Snow Fall", icon: "snowflake", code: "cloud" },
      77: { condition: "Snow Grains", icon: "snowflake", code: "cloud" },
      80: { condition: "Slight Rain Showers", icon: "cloud-rain", code: "cloud-rain" },
      81: { condition: "Moderate Rain Showers", icon: "cloud-rain", code: "cloud-rain" },
      82: { condition: "Violent Rain Showers", icon: "cloud-rain", code: "cloud-rain" },
      85: { condition: "Slight Snow Showers", icon: "snowflake", code: "cloud" },
      86: { condition: "Heavy Snow Showers", icon: "snowflake", code: "cloud" },
      95: { condition: "Thunderstorm", icon: "cloud-lightning", code: "cloud-lightning" },
      96: { condition: "Thunderstorm with Slight Hail", icon: "cloud-lightning", code: "cloud-lightning" },
      99: { condition: "Thunderstorm with Heavy Hail", icon: "cloud-lightning", code: "cloud-lightning" },
    };
    return table[code] || { condition: "Partly Cloudy", icon: isDay ? "cloud-sun" : "cloud-moon", code: "partly-cloudy" };
  },

  /**
   * Converts wind degrees to 16-point compass direction
   */
  degToCompass(num) {
    const val = Math.floor((num / 22.5) + 0.5);
    const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return arr[(val % 16)];
  },

  /**
   * Returns human-readable AQI classification
   */
  getAqiCategory(aqi) {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Satisfactory";
    if (aqi <= 150) return "Moderate";
    if (aqi <= 200) return "Unhealthy for Sensitive Groups";
    if (aqi <= 300) return "Very Unhealthy";
    return "Hazardous";
  },

  /**
   * Returns human-readable UV classification
   */
  getUvCategory(uv) {
    if (uv <= 2) return "Low UV";
    if (uv <= 5) return "Moderate UV";
    if (uv <= 7) return "High UV";
    if (uv <= 10) return "Very High UV";
    return "Extreme UV";
  }
};

