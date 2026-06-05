exports.handler = async (event) => {
    const SHIPPO_KEY = process.env.SHIPPO_KEY;
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }
    try {
        const body = JSON.parse(event.body);
        const response = await fetch("https://api.goshippo.com/shipments/", {
            method: "POST",
            headers: {
                "Authorization": "ShippoToken " + SHIPPO_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
