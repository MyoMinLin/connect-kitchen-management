import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './UserManagement.css';

// This interface should match the IUser from the backend
interface User {
    _id: string;
    username: string;
    role: 'Admin' | 'Kitchen' | 'Waiter';
}

const UserManagement = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { token } = useAuth();

    // Form state
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'Waiter' | 'Kitchen'>('Waiter');

    const api = (endpoint: string, method: string, body?: any) => {
        return fetch(`http://localhost:4000/api/users${endpoint}`,
            {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: body ? JSON.stringify(body) : undefined
            }
        ).then(async res => {
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'An error occurred');
            }
            return res.json();
        });
    }

    const fetchUsers = () => {
        setIsLoading(true);
        api('/', 'GET')
            .then(data => setUsers(data))
            .catch(err => setError(err.message))
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        api('/', 'POST', { username, password, role })
            .then(() => {
                fetchUsers(); // Refresh list
                setUsername('');
                setPassword('');
            })
            .catch(err => setError(err.message));
    };

    const handleDeleteUser = (userId: string) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            api(`/${userId}`, 'DELETE')
                .then(() => fetchUsers()) // Refresh list
                .catch(err => setError(err.message));
        }
    };

    return (
        <div className="user-management-container">
            <h3>Manage Users</h3>
            {error && <p className="error-message">{error}</p>}

            <form onSubmit={handleCreateUser} className="user-form">
                <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
                <input type="password" placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} required />
                <select value={role} onChange={e => setRole(e.target.value as any)}>
                    <option value="Waiter">Waiter</option>
                    <option value="Kitchen">Kitchen</option>
                </select>
                <button type="submit">Create User</button>
            </form>

            {isLoading ? <p>Loading users...</p> : (
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Role</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user._id}>
                                <td>{user.username}</td>
                                <td>{user.role}</td>
                                <td>
                                    {user.username !== 'admin' && (
                                        <button onClick={() => handleDeleteUser(user._id)} className="delete-btn">
                                            Delete
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default UserManagement;
