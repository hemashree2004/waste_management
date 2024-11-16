const express = require('express');
const fs = require('fs').promises;
const app = express();
app.use(express.json());

let complaintsQueue = [];
let deletedComplaintsStack = [];

app.get('/', (req, res) => {
    res.send('Welcome to the Waste Management System API');
});

// Helper function to save data to file
async function saveDataToFile() {
    await fs.writeFile('complaints.json', JSON.stringify(complaintsQueue, null, 2));
}

// Load initial data from file
async function loadDataFromFile() {
    try {
        const data = await fs.readFile('complaints.json', 'utf-8');
        complaintsQueue = JSON.parse(data);
    } catch (error) {
        complaintsQueue = [];
    }
}

// Endpoint to add a new complaint
app.post('/complaints', async (req, res) => {
    const { description, urgency } = req.body;
    const id = complaintsQueue.length + 1;
    complaintsQueue.push({ id, description, urgency });
    complaintsQueue.sort((a, b) => b.urgency - a.urgency); // prioritize by urgency
    await saveDataToFile();
    res.status(201).json({ message: 'Complaint added successfully', id });
});

// Endpoint to retrieve all complaints
app.get('/complaints', (req, res) => {
    res.json(complaintsQueue);
});

// Endpoint to retrieve a complaint by ID
app.get('/complaints/:id', (req, res) => {
    const complaint = complaintsQueue.find(c => c.id === parseInt(req.params.id));
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    res.json(complaint);
});

// Endpoint to delete a complaint
app.delete('/complaints/:id', async (req, res) => {
    const index = complaintsQueue.findIndex(c => c.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ message: 'Complaint not found' });
    const removedComplaint = complaintsQueue.splice(index, 1)[0];
    deletedComplaintsStack.push(removedComplaint); // push to stack for undo
    await saveDataToFile();
    res.json({ message: 'Complaint deleted successfully' });
});

// Endpoint to undo the last deleted complaint
app.post('/undo', async (req, res) => {
    if (deletedComplaintsStack.length === 0) return res.status(400).json({ message: 'No complaints to undo' });
    const lastDeletedComplaint = deletedComplaintsStack.pop();
    complaintsQueue.push(lastDeletedComplaint);
    complaintsQueue.sort((a, b) => b.urgency - a.urgency);
    await saveDataToFile();
    res.json({ message: 'Undo successful', complaint: lastDeletedComplaint });
});

// Initialize server and load data from file
const PORT = process.env.PORT || 3005;
loadDataFromFile().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
