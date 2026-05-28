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

let githubContext = { sha: null, author: null, message: null };
let slackContext = [];

// Fetch real GitHub commits periodically
const fetchGitHubCommits = async () => {
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) return;
  try {
    const branch = process.env.GITHUB_BRANCH || 'main';
    const response = await axios.get(`https://api.github.com/repos/${process.env.GITHUB_REPO}/commits?sha=${branch}&per_page=1`, {
      headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    });
    if (response.data && response.data.length > 0) {
      const commit = response.data[0];
      const newSha = commit.sha.substring(0, 7);
      if (githubContext.sha !== newSha) {
        githubContext = {
          sha: newSha,
          author: commit.commit.author.name,
          message: commit.commit.message
        };
        eventStream.unshift({ id: eventId++, source: 'GITHUB', timestamp: new Date().toISOString(), level: 'INFO', message: `Deployed ${githubContext.sha} by ${githubContext.author}: ${githubContext.message}` });
        if (eventStream.length > 8) eventStream.pop();
      }
    }
  } catch (err) {
    console.error("GitHub fetch error:", err.message);
  }
};

setInterval(fetchGitHubCommits, 10000); // Poll every 10s
fetchGitHubCommits();

app.post("/webhook/slack", (req, res) => {
  const { message, user = "on-call" } = req.body;
  if (message) {
    slackContext.push({ user, message, time: new Date().toISOString() });
    eventStream.unshift({ id: eventId++, source: 'SLACK', timestamp: new Date().toISOString(), level: 'WARNING', message: `[${user}] ${message}` });
    if (eventStream.length > 8) eventStream.pop();
  }
  res.json({ status: "ok" });
});

app.get("/history", (req, res) => {
  res.json(getHistoricalSnapshots(githubContext));
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

Real GitHub Context:
Last Commit: ${githubContext.sha} by ${githubContext.author} - "${githubContext.message}"

Real Slack Context:
${slackContext.map(s => `[${s.time}] ${s.user}: ${s.message}`).join("\n")}

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
  checkoutLatency: 120,
  dbConnections: 45,
  authQueue: 2,
  errorRate: 0,
  impactRadius: 0,
  confidence: 99,
  deploymentRisk: 10,
  fragilityScore: 15
};

let velocityState = {
  lastDbConnections: 45,
  lastCheckoutLatency: 120,
  lastAuthQueue: 2,
  escalationMomentum: 0
};

let eventStream = [];
let eventId = 1;
let simulationTick = 0; // Each tick is 2 seconds

const resetSimulation = () => {
  simulationTick = 0;
  baseState = {
    apiGatewayLatency: 12, authLatency: 45, checkoutLatency: 80,
    dbConnections: 30, authQueue: 0, errorRate: 0, impactRadius: 0,
    confidence: 99, deploymentRisk: 2, fragilityScore: 5
  };
  velocityState = {
    lastDbConnections: 30, lastCheckoutLatency: 80, lastAuthQueue: 0, escalationMomentum: 0
  };
  eventStream = [];
  eventId = 1;
};

// Helper to interpolate between current and target
const moveToward = (current, target, step, variance = 0) => {
  let next = current;
  if (current < target) next = Math.min(current + step, target);
  if (current > target) next = Math.max(current - step, target);
  
  if (variance > 0) {
    const delta = (Math.random() * variance * 2) - variance;
    next += delta;
  }
  return next;
};

const generateLiveState = () => {
  simulationTick++;
  
  // Stages: Let Stage 0 last 15 ticks (30s)
  let stage = 0;
  if (simulationTick > 15) stage = 1; // 30s
  if (simulationTick > 25) stage = 2; // 50s
  if (simulationTick > 35) stage = 3; // 70s
  if (simulationTick > 45) stage = 4; // 90s

  // Determine target metrics based on stage
  let targets = {
    apiGatewayLatency: 12, authLatency: 45, checkoutLatency: 80, 
    dbConnections: 35, authQueue: 0, errorRate: 0, impactRadius: 0, 
    confidence: 99, deploymentRisk: 2, fragilityScore: 5
  };

  if (stage >= 1) {
    // Gentle early degradation
    targets.checkoutLatency = 300;
    targets.dbConnections = 45;
    targets.fragilityScore = 20;
    targets.deploymentRisk = 15;
  }
  if (stage >= 2) {
    targets.checkoutLatency = 1500;
    targets.dbConnections = 75;
    targets.authQueue = 5;
    targets.errorRate = 40;
    targets.impactRadius = 2;
    targets.fragilityScore = 45;
    targets.confidence = 90;
  }
  if (stage >= 3) {
    targets.checkoutLatency = 5000;
    targets.dbConnections = 98;
    targets.authQueue = 30;
    targets.apiGatewayLatency = 35;
    targets.authLatency = 150;
    targets.errorRate = 250;
    targets.impactRadius = 12;
    targets.fragilityScore = 80;
    targets.confidence = 92;
  }
  if (stage >= 4) {
    targets.checkoutLatency = 9000;
    targets.dbConnections = 100;
    targets.authQueue = 45;
    targets.errorRate = 412;
    targets.fragilityScore = 95;
    targets.confidence = 99;
  }

  // Soften initial interpolation velocity based on stage
  const latencyStep = stage <= 1 ? 15 : (stage === 2 ? 150 : 400);
  const dbStep = stage <= 1 ? 0.3 : (stage === 2 ? 1.5 : 3);
  const authQueueStep = stage <= 2 ? 0.3 : 2;

  // Interpolate state
  baseState.apiGatewayLatency = moveToward(baseState.apiGatewayLatency, targets.apiGatewayLatency, 1, 2);
  baseState.authLatency = moveToward(baseState.authLatency, targets.authLatency, 2, 2);
  baseState.checkoutLatency = moveToward(baseState.checkoutLatency, targets.checkoutLatency, latencyStep, 20);
  baseState.dbConnections = moveToward(baseState.dbConnections, targets.dbConnections, dbStep, 1);
  baseState.authQueue = moveToward(baseState.authQueue, targets.authQueue, authQueueStep, 0.2);
  baseState.errorRate = moveToward(baseState.errorRate, targets.errorRate, 8, 2);
  baseState.impactRadius = moveToward(baseState.impactRadius, targets.impactRadius, 1, 0);
  baseState.confidence = moveToward(baseState.confidence, targets.confidence, 1, 0);
  baseState.deploymentRisk = moveToward(baseState.deploymentRisk, targets.deploymentRisk, 1, 1);
  baseState.fragilityScore = moveToward(baseState.fragilityScore, targets.fragilityScore, 1, 1);

  // Velocity and Forecasting Logic
  const dbDelta = baseState.dbConnections - velocityState.lastDbConnections;
  const latencyDelta = baseState.checkoutLatency - velocityState.lastCheckoutLatency;
  
  velocityState.lastDbConnections = baseState.dbConnections;
  velocityState.lastCheckoutLatency = baseState.checkoutLatency;
  velocityState.lastAuthQueue = baseState.authQueue;

  if (dbDelta > 0 && latencyDelta > 0) velocityState.escalationMomentum += 10;
  else if (stage >= 4) velocityState.escalationMomentum += 0;
  else velocityState.escalationMomentum -= 2;
  
  velocityState.escalationMomentum = Math.min(Math.max(velocityState.escalationMomentum, 0), 100);

  let dbSaturationEta = (dbDelta > 0 && baseState.dbConnections < 99) 
    ? `${Math.max(1, Math.round((100 - baseState.dbConnections) / (dbDelta + 0.1)))}m` 
    : "Stable";
  if (baseState.dbConnections >= 99) dbSaturationEta = "Saturated";

  let authInstability = Math.round(baseState.authQueue * 1.5 + velocityState.escalationMomentum * 0.2);

  const forecast = {
    dbSaturationEta,
    authInstabilityProbability: Math.min(authInstability, 99),
    escalationMomentum: Math.round(velocityState.escalationMomentum)
  };

  // Stage-based Event Injection
  if (simulationTick === 1) {
    eventStream.unshift({ id: eventId++, source: 'CORAL', timestamp: new Date().toISOString(), level: 'INFO', message: 'Coral Operational Intelligence Engine actively monitoring infrastructure.' });
  }
  if (simulationTick === 4) {
    eventStream.unshift({ id: eventId++, source: 'CORAL', timestamp: new Date().toISOString(), level: 'INFO', message: 'Coral observed minor queue instability emerging in secondary services.' });
  }
  if (simulationTick === 12) {
    eventStream.unshift({ id: eventId++, source: 'CORAL', timestamp: new Date().toISOString(), level: 'WARNING', message: 'Coral detected elevated retry pressure in Database pool.' });
  }
  if (simulationTick === 18) {
    eventStream.unshift({ id: eventId++, source: 'DATADOG', timestamp: new Date().toISOString(), level: 'WARNING', message: 'Checkout Service latency breached 1000ms SLA.' });
  }
  if (simulationTick === 24) {
    eventStream.unshift({ id: eventId++, source: 'CORAL', timestamp: new Date().toISOString(), level: 'AI INFERENCE', message: 'Escalation trajectory increasing rapidly across dependent nodes (DB -> Auth).' });
  }
  if (simulationTick === 30) {
    eventStream.unshift({ id: eventId++, source: 'DATADOG', timestamp: new Date().toISOString(), level: 'CRITICAL', message: 'Primary Database connection pool maxed.' });
  }
  if (simulationTick === 35) {
    eventStream.unshift({ id: eventId++, source: 'PAGERDUTY', timestamp: new Date().toISOString(), level: 'CRITICAL', message: 'Auth token expiry queue breached 40%. API Gateway failing.' });
  }
  if (simulationTick === 42) {
    const deployRef = githubContext.sha ? `Commit ${githubContext.sha} by ${githubContext.author}` : "Deploy #882";
    eventStream.unshift({ id: eventId++, source: 'CORAL', timestamp: new Date().toISOString(), level: 'AI INFERENCE', message: `Coral isolated anomaly root cause to ${deployRef}. Immediate rollback recommended.` });
  }

  const deployRef = githubContext.sha ? `Commit ${githubContext.sha} by ${githubContext.author}` : "Deploy #882";
  
  let incidentTitle = "INFO: Operations Stable";
  let incidentDesc = "All infrastructure systems operating within nominal parameters.";
  if (stage === 1) { incidentTitle = "WARNING: Checkout Latency Spiking"; incidentDesc = "Checkout service latency exceeded SLA."; }
  if (stage === 2) { incidentTitle = "CRITICAL: Database Saturation"; incidentDesc = "Inefficient queries causing DB connection pool exhaustion."; }
  if (stage >= 3) { incidentTitle = "CRITICAL: System-wide Cascading Failure"; incidentDesc = "Cascading latency spikes detected across API Gateway and Checkout Service following deployment."; }

  const narrative = {
    rootCause: stage >= 1 ? `Coral correlated ${deployRef} with a subsequent Datadog DB saturation anomaly and Kubernetes pod restarts.` : "No anomalies detected.",
    propagation: stage >= 2 ? `Primary Database saturated (Pool: ${Math.round(baseState.dbConnections)}%) -> Checkout Timeout -> Auth Queue Backlog (${Math.round(baseState.authQueue)}%)` : "No significant propagation detected.",
    remediation: stage >= 3 && baseState.confidence > 90 ? `Immediate Rollback of ${deployRef} recommended.` : "Monitor Auth Queue and Checkout Latency.",
    confidence: Math.round(baseState.confidence),
    blastRadius: Math.round(baseState.impactRadius),
    projection: dbDelta > 0 
      ? `High probability of complete database saturation within ${dbSaturationEta}. Cascading auth failure likely.` 
      : (stage >= 3 ? `Escalation peaked. Waiting on rollback.` : `System attempting stabilization.`),
    rankedCauses: [
      { service: "Checkout Service", influence: Math.round(baseState.checkoutLatency / 100) },
      { service: "Primary Database", influence: Math.round(baseState.dbConnections * 0.9) },
      { service: "Auth Service", influence: Math.round(baseState.authQueue * 1.5) }
    ].sort((a, b) => b.influence - a.influence)
  };

  // Node States based on current metrics
  const authState = baseState.authLatency > 100 ? 'critical' : baseState.authLatency > 60 ? 'degraded' : 'healthy';
  const checkoutState = baseState.checkoutLatency > 4000 ? 'critical' : baseState.checkoutLatency > 800 ? 'degraded' : 'healthy';
  const dbState = baseState.dbConnections > 95 ? 'critical' : baseState.dbConnections > 60 ? 'degraded' : 'healthy';

  return {
    incident: {
      title: incidentTitle,
      description: incidentDesc,
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
      { id: '3', type: 'custom', position: { x: 420, y: 170 }, data: { label: 'Checkout Service', subLabel: `Latency: ${baseState.checkoutLatency > 1000 ? '>' : ''}${Math.round(baseState.checkoutLatency)}ms`, iconName: 'Cpu', state: checkoutState, influenceScore: Math.round(baseState.checkoutLatency / 100) } },
      { id: '4', type: 'custom', position: { x: 350, y: 340 }, data: { label: 'Primary Database', subLabel: `Connections: ${baseState.dbConnections >= 99 ? 'Maxed' : Math.round(baseState.dbConnections)}`, iconName: 'Database', state: dbState, influenceScore: Math.round(baseState.dbConnections * 0.9) } },
      { id: '5', type: 'custom', position: { x: -50, y: 340 }, data: { label: 'User DB', subLabel: `Connections: 45`, iconName: 'Database', state: 'healthy', influenceScore: 10 } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: authState === 'critical' ? '#ef4444' : authState === 'degraded' ? '#eab308' : '#06b6d4', strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: authState === 'critical' ? '#ef4444' : authState === 'degraded' ? '#eab308' : '#06b6d4' } },
      { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: checkoutState === 'critical' ? '#ef4444' : checkoutState === 'degraded' ? '#eab308' : '#06b6d4', strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: checkoutState === 'critical' ? '#ef4444' : checkoutState === 'degraded' ? '#eab308' : '#06b6d4' } },
      { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: dbState === 'critical' ? '#ef4444' : dbState === 'degraded' ? '#eab308' : '#06b6d4', strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: dbState === 'critical' ? '#ef4444' : dbState === 'degraded' ? '#eab308' : '#06b6d4' } },
      { id: 'e2-5', source: '2', target: '5', animated: true, style: { stroke: '#06b6d4', strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: '#06b6d4' } }
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
  resetSimulation();
  
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