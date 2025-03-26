// Frontend: App.js (React)

import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
    const [file, setFile] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        try {
            const response = await axios.get('http://localhost:5000/expenses');
            setExpenses(response.data);
        } catch (error) {
            console.error('Error fetching expenses:', error);
            setError('Failed to load expenses. Please try again.');
        }
    };

    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) return alert('Please select a file');
        setLoading(true);
        setError(null);
        
        const formData = new FormData();
        formData.append('receipt', file);

        try {
            const response = await axios.post('http://localhost:5000/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Receipt processed successfully');
            fetchExpenses(); // Refresh expenses list
        } catch (error) {
            console.error('Error uploading receipt:', error);
            setError('Upload failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1>Expense Tracker</h1>
            <input type="file" onChange={handleFileChange} />
            <button onClick={handleUpload} disabled={loading}>
                {loading ? 'Uploading...' : 'Upload Receipt'}
            </button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <h2>Expenses</h2>
            <ul>
                {expenses.length > 0 ? (
                    expenses.map((expense, index) => (
                        <li key={index}>{expense.item} - ${expense.price.toFixed(2)}</li>
                    ))
                ) : (
                    <p>No expenses recorded yet.</p>
                )}
            </ul>
        </div>
    );
}

export default App;
