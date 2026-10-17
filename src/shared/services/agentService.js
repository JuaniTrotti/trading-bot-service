/**
 * Helper para hacer requests a la API del agente de trading
 */
async function agentRequest(endpoint, payload) {
    const url = `${process.env.AGENT_API_URL}${endpoint}`;

    console.log(`\n========== REQUEST AL AGENTE ==========`);
    console.log(`URL: ${url}`);
    console.log(`Payload:`, JSON.stringify(payload, null, 2));
    console.log(`=====================================\n`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.AGENT_API_SECRET}`
        },
        body: JSON.stringify(payload)
    });

    const responseText = await response.text();

    console.log(`\n========== RESPUESTA DEL AGENTE ==========`);
    console.log(`Status: ${response.status}`);
    console.log(`Body: ${responseText}`);
    console.log(`=========================================\n`);

    if (!response.ok) {
        throw new Error(`Agent API error: ${response.status} ${response.statusText}`);
    }

    return JSON.parse(responseText);
}

module.exports = {
    agentRequest
};
