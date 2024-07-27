const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const cors = require('cors');
const fetch = require('node-fetch'); // To make HTTP requests
const supabase = require('@supabase/supabase-js'); // Supabase client

dotenv.config();

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(express.json());

const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key';
const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY || 'your-refresh-secret-key';

let refreshTokens = []; // Store refresh tokens in memory (use a database in production)

// Sample user for demonstration
const users = [{ id: 1, username: 'user1', password: 'pass1' }];

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Route to authenticate and generate tokens
app.post('/authenticate', (req, res) => {
    const { username, password } = req.body;

    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return res.sendStatus(401);

    // Generate access token with 1 hour expiration
    const accessToken = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '1h' });
    // Generate refresh token with 6 hours expiration
    const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET_KEY, { expiresIn: '6h' });
    refreshTokens.push(refreshToken); // Store refresh token

    res.json({ accessToken, refreshToken });
});

// Route to refresh access token
app.post('/token', (req, res) => {
    const { token } = req.body;
    if (!token || !refreshTokens.includes(token)) return res.sendStatus(403);

    jwt.verify(token, REFRESH_SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        // Generate new access token with 1 hour expiration
        const accessToken = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ accessToken });
    });
});

// Middleware to verify the access token
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Route to validate existing access token and refresh if necessary
app.post('/validate-token', authenticateToken, (req, res) => {
    res.json({ message: 'Token is valid', user: req.user });
});


// Callback endpoint for Coinbase payment success
app.post('/payment-success', async (req, res) => {
    const { username, amount, chargeId } = req.body; // Use body data

    // Validate incoming data
    if (!username || !amount || !chargeId) {
        return res.status(400).send('Invalid data received');
    }

    try {
        // Append payment data to Supabase
        const { data, error } = await supabaseClient
            .from('userdata')
            .insert([{ username, amount, chargeId }]); 

        if (error) {
            console.error('Error inserting payment data into Supabase:', error.message);
            return res.status(500).send('Error logging payment');
        }

        console.log('Payment logged successfully:', data);
        res.status(200).send('Payment logged successfully');
    } catch (error) {
        console.error('Error in payment success handler:', error.message);
        res.status(500).send('Server error');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
