module.exports = function getHistoricalSnapshots() {
  const t0 = new Date(Date.now() - 3600000).toISOString();
  const t1 = new Date(Date.now() - 3000000).toISOString();
  const t2 = new Date(Date.now() - 2400000).toISOString();
  const t3 = new Date(Date.now() - 1800000).toISOString();
  const t4 = new Date(Date.now() - 1200000).toISOString();
  const t5 = new Date(Date.now() - 600000).toISOString();

  // Helper to generate the standard payload structure
  const makeSnapshot = (
    time, title, desc, impact, errorRate, 
    db, auth, risk, frag,
    root, prop, rem, conf, proj,
    dbEta, authInstab, escalMom,
    events,
    apiL, authL, checkL, authS, checkS, dbS,
    infApi, infAuth, infCheck, infDb, infUser
  ) => ({
    timestamp: time,
    incident: { title, description: desc, impactRadius: impact, errorRate },
    metrics: { dbPool: db, authQueue: auth, deploymentRisk: risk, fragilityScore: frag },
    forecast: { dbSaturationEta: dbEta, authInstabilityProbability: authInstab, escalationMomentum: escalMom },
    narrative: { 
      rootCause: root, propagation: prop, remediation: rem, confidence: conf, blastRadius: impact, projection: proj,
      rankedCauses: [
        { service: "Checkout Service", influence: infCheck },
        { service: "Primary Database", influence: infDb },
        { service: "Auth Service", influence: infAuth }
      ].sort((a, b) => b.influence - a.influence)
    },
    events,
    nodes: [
      { id: '1', type: 'custom', position: { x: 250, y: 0 }, data: { label: 'API Gateway', subLabel: `Latency: ${apiL}ms`, iconName: 'CloudRain', state: 'healthy', influenceScore: infApi } },
      { id: '2', type: 'custom', position: { x: 100, y: 170 }, data: { label: 'Auth Service', subLabel: `Latency: ${authL}ms`, iconName: 'ShieldAlert', state: authS, influenceScore: infAuth } },
      { id: '3', type: 'custom', position: { x: 420, y: 170 }, data: { label: 'Checkout Service', subLabel: `Latency: ${checkL}ms`, iconName: 'Cpu', state: checkS, influenceScore: infCheck } },
      { id: '4', type: 'custom', position: { x: 250, y: 340 }, data: { label: 'Primary Database', subLabel: `Connections: ${db > 95 ? 'Maxed' : db}`, iconName: 'Database', state: dbS, influenceScore: infDb } },
      { id: '5', type: 'custom', position: { x: 20, y: 340 }, data: { label: 'User DB', subLabel: `Connections: 45`, iconName: 'Database', state: 'healthy', influenceScore: infUser } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: authS === 'critical' ? '#ef4444' : authS === 'degraded' ? '#eab308' : '#06b6d4', strokeWidth: 2 }, markerEnd: { type: 'ArrowClosed', color: authS === 'critical' ? '#ef4444' : authS === 'degraded' ? '#eab308' : '#06b6d4' } },
      { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: checkS === 'critical' ? '#ef4444' : checkS === 'degraded' ? '#eab308' : '#06b6d4', strokeWidth: 2 }, markerEnd: { type: 'ArrowClosed', color: checkS === 'critical' ? '#ef4444' : checkS === 'degraded' ? '#eab308' : '#06b6d4' } },
      { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: dbS === 'critical' ? '#ef4444' : dbS === 'degraded' ? '#eab308' : '#06b6d4', strokeWidth: 2 }, markerEnd: { type: 'ArrowClosed', color: dbS === 'critical' ? '#ef4444' : dbS === 'degraded' ? '#eab308' : '#06b6d4' } },
      { id: 'e2-5', source: '2', target: '5', animated: true, style: { stroke: '#06b6d4', strokeWidth: 2 }, markerEnd: { type: 'ArrowClosed', color: '#06b6d4' } }
    ]
  });

  return [
    // T-0: Deploy Initiated (Healthy)
    makeSnapshot(t0, 
      "INFO: Deploy #882 Initiated", "Standard rollout for checkout pipeline patch.", 0, "+0%",
      45, 2, 10, 15,
      "None", "None", "Monitor deployment.", 99,
      "Stable operations. No projected instability.", "Stable", 5, 0,
      [{ id: 10, source: 'GITHUB', timestamp: t0, level: 'INFO', message: 'Deploy #882 initiated by CI/CD pipeline.' }],
      12, 45, 120, 'healthy', 'healthy', 'healthy',
      10, 10, 10, 10, 10
    ),
    // T-1: Checkout begins failing
    makeSnapshot(t1,
      "WARNING: Checkout Latency Spiking", "Checkout service latency exceeded 1000ms SLA.", 1, "+45%",
      55, 5, 45, 30,
      "Deploy #882 introduced inefficient query.", "Checkout Service -> Database", "Investigate checkout latency.", 85,
      "Trajectory indicates DB saturation within 15m.", "15m", 30, 45,
      [{ id: 11, source: 'DATADOG', timestamp: t1, level: 'WARNING', message: 'Checkout Service latency breached 1000ms.' }, { id: 10, source: 'GITHUB', timestamp: t0, level: 'INFO', message: 'Deploy #882 initiated by CI/CD pipeline.' }],
      15, 46, 1200, 'healthy', 'degraded', 'healthy',
      10, 20, 60, 40, 10
    ),
    // T-2: Database saturates
    makeSnapshot(t2,
      "CRITICAL: Database Saturation", "Inefficient queries causing DB connection pool exhaustion.", 3, "+150%",
      98, 10, 75, 60,
      "Deploy #882 introduced blocking table lock.", "Checkout Service -> Primary Database (98%)", "Prepare DB failover or rollback.", 92,
      "DB saturation imminent. Prepare for cascading auth failure.", "2m", 65, 80,
      [{ id: 12, source: 'DATADOG', timestamp: t2, level: 'CRITICAL', message: 'Primary Database connection pool maxed.' }, { id: 11, source: 'DATADOG', timestamp: t1, level: 'WARNING', message: 'Checkout Service latency breached 1000ms.' }],
      20, 50, 4500, 'healthy', 'critical', 'critical',
      20, 40, 85, 90, 10
    ),
    // T-3: Auth Degrades
    makeSnapshot(t3,
      "CRITICAL: Cascading Failure", "API Gateway queuing requests. Auth queue building.", 8, "+280%",
      99, 45, 90, 85,
      "Deploy #882 lock cascading to Auth.", "Checkout -> DB -> API Gateway -> Auth", "Recommend immediate rollback.", 96,
      "System-wide failure projected. Auth queue critical.", "0m", 92, 95,
      [{ id: 13, source: 'PAGERDUTY', timestamp: t3, level: 'CRITICAL', message: 'Auth token expiry queue breached 40%.' }, { id: 12, source: 'DATADOG', timestamp: t2, level: 'CRITICAL', message: 'Primary Database connection pool maxed.' }],
      35, 150, 6000, 'degraded', 'critical', 'critical',
      50, 80, 95, 98, 10
    ),
    // T-4: Peak Incident
    makeSnapshot(t4,
      "CRITICAL: System-wide Checkout Failure", "Total checkout outage across 12 services.", 12, "+412%",
      100, 89, 99, 98,
      "Deploy #882.", "Primary Database saturated -> Checkout Timeout -> Auth Queue Backlog", "IMMEDIATE ROLLBACK REQUIRED.", 99,
      "Escalation peaked. Waiting on rollback.", "Stable", 99, 100,
      [{ id: 14, source: 'CORAL', timestamp: t4, level: 'AI INFERENCE', message: 'Coral isolated anomaly to Deploy #882. Rollback required.' }, { id: 13, source: 'PAGERDUTY', timestamp: t3, level: 'CRITICAL', message: 'Auth token expiry queue breached 40%.' }],
      45, 300, 9000, 'critical', 'critical', 'critical',
      80, 95, 100, 100, 10
    ),
    // T-5: Rollback Initiated
    makeSnapshot(t5,
      "INFO: Rollback Initiated", "Reverting Deploy #882.", 12, "+300%",
      80, 50, 60, 50,
      "Deploy #882.", "Mitigation in progress.", "Monitor DB pool recovery.", 99,
      "System attempting stabilization. Escalation momentum dropping.", "Stable", 40, 20,
      [{ id: 15, source: 'GITHUB', timestamp: t5, level: 'INFO', message: 'Rollback of Deploy #882 initiated by admin.' }, { id: 14, source: 'CORAL', timestamp: t4, level: 'AI INFERENCE', message: 'Coral isolated anomaly to Deploy #882. Rollback required.' }],
      20, 100, 2000, 'degraded', 'degraded', 'degraded',
      30, 50, 70, 80, 10
    )
  ];
};
