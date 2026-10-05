
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Users() {
    const [users, setUsers] = useState([]);



    useEffect(() => {
        const fetchUsers = async () => {
            const response = await fetch('http://localhost:8000/customers',
                {
                    headers: {
                        'method': 'GET',
                        'Content-Type': 'application/json'
                    }
                }
            )
            const data = await response.json()
            setUsers(data);
            // console.log(data);
        }
        fetchUsers();
    }, []);


  return (
    <div>
      <p>Users</p>
        {users.map((user: {id: string, name: string}) => (
        <div key={user.id}>
            <p>{user.name}</p>
            <Route path="/order/:userId/:userName" element={<OrderHistory />} />

            {/* <Link to={`/order/${user.id}/${user.name}`}>View Orders</Link> */}
        </div>
        ))}
    </div>
  )
}