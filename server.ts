import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fetch from "node-fetch";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Wave Checkout
  app.post("/api/wave-checkout", async (req, res) => {
    const { amount, client_reference, success_url, error_url } = req.body;
    
    // Il faut la vraie clé secrète Wave
    const WAVE_API_KEY = process.env.WAVE_API_KEY;
    
    if (!WAVE_API_KEY) {
      console.error("WAVE_API_KEY non définie");
      return res.status(500).json({ error: "Configuration Wave manquante sur le serveur." });
    }

    try {
      const response = await fetch("https://api.wave.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WAVE_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: String(amount),
          currency: "XOF",
          error_url,
          success_url,
          client_reference
        })
      });

      if (!response.ok) {
        const errData = await response.text();
        console.error("Erreur Wave:", errData);
        let parsedData = null;
        try {
          parsedData = JSON.parse(errData);
        } catch(e) {}
        return res.status(response.status).json({ 
          error: "Erreur lors de la création de la session Wave", 
          details: parsedData || errData 
        });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Exception API Wave:", error);
      res.status(500).json({ error: "Exception lors de la communication avec Wave" });
    }
  });

  // API Route for Wave Checkout Verify
  app.post("/api/wave-verify", async (req, res) => {
    const { sessionId } = req.body;
    const WAVE_API_KEY = process.env.WAVE_API_KEY;

    if (!WAVE_API_KEY) {
      return res.status(500).json({ error: "Configuration Wave manquante sur le serveur." });
    }

    try {
      const response = await fetch(`https://api.wave.com/v1/checkout/sessions/${sessionId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${WAVE_API_KEY}`
        }
      });

      if (!response.ok) {
        const errData = await response.text();
        console.error("Erreur Wave Verify:", errData);
        return res.status(500).json({ error: "Erreur lors de la vérification Wave", details: errData });
      }

      const data = await response.json();
      res.json(data); // data has payment_status (e.g. "succeeded", "processing", "cancelled")
    } catch (error) {
      console.error("Exception API Wave Verify:", error);
      res.status(500).json({ error: "Exception lors de la communication avec Wave" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
