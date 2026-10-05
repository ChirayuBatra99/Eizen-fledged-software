
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';


export default function Order() {
    const { userId, userName } = useParams();
    console.log(userId, userName);
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        const fetchOrders = async () => {
            const response = await fetch(`http://localhost:8000/orders?customer_id=${userId}`,
                {
                    headers: {
                        'method': 'GET',
                        'Content-Type': 'application/json'
                    }
                }
            )
            const data = await response.json()
            setOrders(data);
        };
        fetchOrders();
    }, [userId]);


    return (
        <div>
            {orders.map((order: {id: string, amount: number}) => (
                <div key={order.id}>
                    <p>{order.amount}</p>
                </div>
            ))}
        </div>
    )
};