const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializa o Firebase Admin SDK
const serviceAccount = require('./firebaseServiceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.use(cors());
app.use(bodyParser.json());

// Conecta ao MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Modelo de Venda
const Sale = mongoose.model('Sale', new mongoose.Schema({
  product: String,
  amount: Number,
  status: String,
  date: Date,
  transactionId: String,
  affId: String
}));

// Rota que recebe postbacks
app.post('/postback', async (req, res) => {
  const { product, amount, status, transaction_id, aff_id } = req.body;

  if (!aff_id) return res.status(400).send('Missing aff_id');

  const sale = new Sale({
    product,
    amount: parseFloat(amount),
    status,
    date: new Date(),
    transactionId: transaction_id,
    affId: aff_id
  });

  await sale.save();

  const deviceToken = await getDeviceTokenForAffId(aff_id);

  if (deviceToken) {
    const message = {
      notification: {
        title: 'Nova Venda! 💰',
        body: `${product} - $${amount} (${status})`
      },
      token: deviceToken
    };

    try {
      await admin.messaging().send(message);
      res.send('Postback recebido e notificação enviada.');
    } catch (err) {
      console.error('Erro ao enviar push:', err);
      res.status(500).send('Erro ao enviar push.');
    }
  } else {
    res.status(404).send('Device não encontrado para este aff_id');
  }
});

// Função mock para retornar device token baseado no aff_id
async function getDeviceTokenForAffId(affId) {
  const mockMapping = {
    'aff123': 'DISPOSITIVO_FIREBASE_TOKEN_AQUI'
  };
  return mockMapping[affId] || null;
}

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
