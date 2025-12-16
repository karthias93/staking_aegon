"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
} from "recharts";

const graphics = [
  { name: "A", value: 30 },
  { name: "B", value: 50 },
  { name: "C", value: 20 },
  { name: "D", value: 80 },
  { name: "E", value: 40 },
  { name: "F", value: 60 },
  { name: "G", value: 30 },
  { name: "H", value: 50 },
  { name: "I", value: 20 },
  { name: "J", value: 70 },
  { name: "K", value: 40 },
  { name: "L", value: 50 },
];

export default function ChartCard() {
  return (
    <div className="p-6 rounded-lg shadow-md">
      <h2 className="text-white text-lg font-bold mb-4 text-center">
        Mempool Chart
      </h2>

      <ResponsiveContainer width="100%" height={100}>
        <LineChart data={graphics}>
          <defs>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="red" />
              <stop offset="50%" stopColor="yellow" />
              <stop offset="100%" stopColor="green" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3" stroke="#40916c" />
          <XAxis dataKey="name" tick={false} />
          <Line
            type="linear"
            dataKey="value"
            stroke="url(#lineGradient)"
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
