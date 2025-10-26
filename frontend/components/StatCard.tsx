interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color: 'green' | 'yellow' | 'blue' | 'red'
}

export default function StatCard({ title, value, icon, color }: StatCardProps) {
  const bgColors = {
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    blue: 'bg-blue-50 border-blue-200',
    red: 'bg-red-50 border-red-200'
  }

  return (
    <div className={`${bgColors[color]} border-2 rounded-lg p-6`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon}
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}