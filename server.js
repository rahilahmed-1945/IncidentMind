const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { exec } = require("child_process");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

const getHistoricalSnapshots = require('./historyData');

app.get("/history", (req, res) => {
  res.json(getHistoricalSnapshots());
});

app.post("/analyze", async (req, res) => {
  const userQuery = req.body.query || "What caused the checkout failure?";
  
  try {
    // Step 1: NL -> SQL (Mocked for speed in hackathon, but showing the architecture)
    // In a real scenario, this would be an LLM call to translate NL to Coral SQL.
    // Let's use a dynamic safe query template based on keywords
    let sqlQuery = `SELECT s.user, s.message, d.deploy_id, d.service FROM incidentmind.slack_messages s JOIN incidentmind.deploy_logs d ON s.service = d.service`;
    if (userQuery.toLowerCase().includes("propagation")) {
      sqlQuery = `SELECT service, downstream_dependencies, error_rate FROM incidentmind.telemetry WHERE status = 'critical'`;
    } else if (userQuery.toLowerCase().includes("engineer") || userQuery.toLowerCase().includes("who")) {
      sqlQuery = `SELECT user, action, service FROM incidentmind.audit_logs WHERE timestamp > '2023-10-01'`;
    }

    // Step 2: Execute Coral Query
    exec(
      `C:\\coral.exe sql "${sqlQuery}"`,
      async (error, stdout, stderr) => {
        let coralData = stdout;
        if (error) {
          // Fallback data if coral fails or table doesn't exist
          coralData = `[{"service": "checkout", "deploy_id": "882", "user": "alice", "message": "Deploying emergency patch"}]`;
        }

        // Step 3: Generative Reasoning
        const prompt = `
You are IncidentMind, an autonomous AI Operational Reasoning Engine.

User Question: ${userQuery}

Executed Coral SQL: ${sqlQuery}

Operational Data Returned:
${coralData}

Analyze this data and reconstruct the incident causality. Provide a concise, grounded operational reasoning response.
`;

        const response = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model: "openai/gpt-oss-120b:free",
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        res.json({
          sql: sqlQuery,
          coralData: coralData,
          analysis: response.data.choices[0].message.content,
        });
      }
    );
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

// Stateful mock data for operational variance
let baseState = {
  apiGatewayLatency: 12,
  authLatency: 45,
  checkoutLatency: 5000,
  dbConnections: 89,
  authQueue: 12,
  errorRate: 312,
  impactRadius: 12,
  confidence: 92,
  deploymentRisk: 85,
  fragilityScore: 78
};

let velocityState = {
  lastDbConnections: 89,
  lastCheckoutLatency: 5000,
  lastAuthQueue: 12,
  escalationMomentum: 50
};

let eventStream = [
  { id: 1, source: 'DATADOG', timestamp: new Date(Date.now() - 10000).toISOString(), level: 'CRITICAL', message: 'Cascading latency spikes detected across API Gateway.' },
  { id: 2, source: 'CORAL', timestamp: new Date(Date.now() - 5000).toISOString(), level: 'AI INFERENCE', message: 'Coral Engine isolated anomaly to Deploy #882.' }
];
let eventId = 3;

// Add variance
const fluctuate = (val, maxVariance, min, max) => {
  const delta = (Math.random() * maxVariance * 2) - maxVariance;
  let newVal = val + delta;
  if (newVal < min) newVal = min;
  if (newVal > max) newVal = max;
  return newVal;
};

const generateLiveState = () => {
  // Probabilistic state transitions
  const rand = Math.random();
  let authState = "degraded";
  if (rand > 0.85) authState = "critical";
  else if (rand < 0.15) authState = "healthy";

  baseState.apiGatewayLatency = fluctuate(baseState.apiGatewayLatency, 5, 5, 40);
  baseState.authLatency = fluctuate(baseState.authLatency, 20, 10, 150);
  baseState.checkoutLatency = fluctuate(baseState.checkoutLatency, 800, 2000, 9000);
  baseState.dbConnections = fluctuate(baseState.dbConnections, 5, 60, 100);
  baseState.authQueue = fluctuate(baseState.authQueue, 4, 0, 40);
  baseState.errorRate = fluctuate(baseState.errorRate, 15, 150, 600);
  baseState.confidence = fluctuate(baseState.confidence, 2, 70, 99);
  baseState.impactRadius = fluctuate(baseState.impactRadius, 1, 5, 20);
  
  // Semantic Abstractions
  baseState.deploymentRisk = fluctuate(baseState.deploymentRisk, 3, 50, 99);
  baseState.fragilityScore = fluctuate(baseState.fragilityScore, 2, 40, 95);
  
  const checkoutState = "critical"; 

  // Velocity and Forecasting Logic
  const dbDelta = baseState.dbConnections - velocityState.lastDbConnections;
  const latencyDelta = baseState.checkoutLatency - velocityState.lastCheckoutLatency;
  
  velocityState.lastDbConnections = baseState.dbConnections;
  velocityState.lastCheckoutLatency = baseState.checkoutLatency;
  velocityState.lastAuthQueue = baseState.authQueue;

  if (dbDelta > 0 && latencyDelta > 0) velocityState.escalationMomentum += 5;
  else if (dbDelta < 0 && latencyDelta < 0) velocityState.escalationMomentum -= 5;
  velocityState.escalationMomentum = Math.min(Math.max(velocityState.escalationMomentum, 0), 100);

  let dbSaturationEta = dbDelta > 0 ? `${Math.max(1, Math.round((100 - baseState.dbConnections) / (dbDelta + 0.1)))}m` : "Stable";
  let authInstability = Math.round(baseState.authQueue * 1.5 + velocityState.escalationMomentum * 0.2);

  const forecast = {
    dbSaturationEta,
    authInstabilityProbability: Math.min(authInstability, 99),
    escalationMomentum: Math.round(velocityState.escalationMomentum)
  };

  // Push new event probabilistically
  if (Math.random() > 0.6) {
    let newEvent = {};
    const typeRand = Math.random();
    if (typeRand < 0.25) {
      newEvent = { source: 'DATADOG', level: 'WARNING', message: `Auth token expiry queue at ${Math.round(baseState.authQueue)}%.` };
    } else if (typeRand < 0.5) {
      newEvent = { source: 'KUBERNETES', level: 'INFO', message: `Retry storm observed from User DB. Pods restarting.` };
    } else if (typeRand < 0.75) {
      newEvent = { source: 'PAGERDUTY', level: 'CRITICAL', message: `Checkout Service latency breached SLA: ${Math.round(baseState.checkoutLatency)}ms` };
    } else {
      newEvent = { source: 'CORAL', level: 'AI INFERENCE', message: `Semantic Fragility Score rose to ${Math.round(baseState.fragilityScore)}. Correlation detected.` };
    }
    
    eventStream.unshift({ id: eventId++, timestamp: new Date().toISOString(), ...newEvent });
    if (eventStream.length > 8) {
      eventStream.pop();
    }
  }

  const narrative = {
    rootCause: `Coral correlated a GitHub Deploy (#882) with a subsequent Datadog DB saturation anomaly and Kubernetes pod restarts.`,
    propagation: `Primary Database saturated (Pool: ${Math.round(baseState.dbConnections)}%) -> Checkout Timeout -> Auth Queue Backlog (${Math.round(baseState.authQueue)}%)`,
    remediation: baseState.confidence > 90 ? "Immediate Rollback of Deploy #882 recommended." : "Monitor Auth Queue before rollback.",
    confidence: Math.round(baseState.confidence),
    blastRadius: Math.round(baseState.impactRadius),
    projection: dbDelta > 0 
      ? `High probability of complete database saturation within ${dbSaturationEta}. Cascading auth failure likely.` 
      : `System attempting stabilization. Escalation momentum dropping.`,
    rankedCauses: [
      { service: "Checkout Service", influence: 92 },
      { service: "Primary Database", influence: Math.round(baseState.dbConnections * 0.9) },
      { service: "Auth Service", influence: Math.round(baseState.authQueue * 1.5) }
    ].sort((a, b) => b.influence - a.influence)
  };

  return {
    incident: {
      title: "CRITICAL: Checkout Failure",
      description: "Cascading latency spikes detected across API Gateway and Checkout Service following Deploy #882.",
      impactRadius: Math.round(baseState.impactRadius),
      errorRate: `+${Math.round(baseState.errorRate)}%`
    },
    metrics: {
      dbPool: Math.round(baseState.dbConnections),
      authQueue: Math.round(baseState.authQueue),
      deploymentRisk: Math.round(baseState.deploymentRisk),
      fragilityScore: Math.round(baseState.fragilityScore)
    },
    forecast,
    narrative,
    events: eventStream,
    nodes: [
      { id: '1', type: 'custom', position: { x: 250, y: 0 }, data: { label: 'API Gateway', subLabel: `Latency: ${Math.round(baseState.apiGatewayLatency)}ms`, iconName: 'CloudRain', state: 'healthy', influenceScore: 20 } },
      { id: '2', type: 'custom', position: { x: 100, y: 170 }, data: { label: 'Auth Service', subLabel: `Latency: ${Math.round(baseState.authLatency)}ms`, iconName: 'ShieldAlert', state: authState, influenceScore: Math.round(baseState.authQueue * 1.5) } },
      { id: '3', type: 'custom', position: { x: 420, y: 170 }, data: { label: 'Checkout Service', subLabel: `Latency: >${Math.round(baseState.checkoutLatency)}ms`, iconName: 'Cpu', state: checkoutState, influenceScore: 92 } },
      { id: '4', type: 'custom', position: { x: 250, y: 340 }, data: { label: 'Primary Database', subLabel: `Connections: ${baseState.dbConnections > 95 ? 'Maxed' : 'High'}`, iconName: 'Database', state: 'critical', influenceScore: Math.round(baseState.dbConnections * 0.9) } },
      { id: '5', type: 'custom', position: { x: 20, y: 340 }, data: { label: 'User DB', subLabel: `Connections: 45`, iconName: 'Database', state: 'healthy', influenceScore: 10 } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: authState === 'critical' ? '#ef4444' : '#eab308', strokeWidth: 2 }, markerEnd: { type: 'ArrowClosed', color: authState === 'critical' ? '#ef4444' : '#eab308' } },
      { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: '#ef4444', strokeWidth: 2 }, markerEnd: { type: 'ArrowClosed', color: '#ef4444' } },
      { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#ef4444', strokeWidth: 2 }, markerEnd: { type: 'ArrowClosed', color: '#ef4444' } },
      { id: 'e2-5', source: '2', target: '5', animated: true, style: { stroke: '#06b6d4', strokeWidth: 2 }, markerEnd: { type: 'ArrowClosed', color: '#06b6d4' } }
    ]
  };
};

// Polling endpoint for fallback/initial fetch
app.get("/live-state", (req, res) => {
  res.json(generateLiveState());
});

// WebSocket Streaming
io.on('connection', (socket) => {
  console.log('Client connected for live telemetry');
  
  // Stream data every 2 seconds
  const interval = setInterval(() => {
    socket.emit('live_state', generateLiveState());
  }, 2000);

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    clearInterval(interval);
  });
});

server.listen(3000, () => {
  console.log("IncidentMind server running on port 3000 (HTTP & WebSockets)");
});