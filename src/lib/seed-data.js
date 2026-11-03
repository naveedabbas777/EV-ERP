export const dashboardMetrics = [
  { label: 'Total Dealers', value: '312', delta: '+14.2%', tone: 'emerald' },
  { label: 'Total Employees', value: '1,284', delta: '+8.5%', tone: 'sky' },
  { label: 'Total Products', value: '22', delta: '+3.1%', tone: 'violet' },
  { label: 'Company Inventory', value: '12,480', delta: '+6.7%', tone: 'amber' },
  { label: 'Dealer Inventory', value: '8,960', delta: '+11.4%', tone: 'rose' },
  { label: 'Total Sales', value: '2,148', delta: '+18.9%', tone: 'cyan' },
  { label: 'Total Revenue', value: '$3.4M', delta: '+12.8%', tone: 'emerald' },
  { label: 'Pending Orders', value: '84', delta: '-4.1%', tone: 'orange' },
  { label: 'Outstanding Balances', value: '$482k', delta: '+2.4%', tone: 'red' },
  { label: 'Regional Performance', value: '91%', delta: '+7.3%', tone: 'indigo' },
];

export const salesChartData = [
  { month: 'Jan', revenue: 42000, orders: 120 },
  { month: 'Feb', revenue: 47000, orders: 130 },
  { month: 'Mar', revenue: 52000, orders: 142 },
  { month: 'Apr', revenue: 46000, orders: 136 },
  { month: 'May', revenue: 61000, orders: 158 },
  { month: 'Jun', revenue: 72000, orders: 182 },
  { month: 'Jul', revenue: 69000, orders: 176 },
  { month: 'Aug', revenue: 81000, orders: 196 },
  { month: 'Sep', revenue: 86000, orders: 210 },
  { month: 'Oct', revenue: 91000, orders: 218 },
  { month: 'Nov', revenue: 98000, orders: 228 },
  { month: 'Dec', revenue: 106000, orders: 242 },
];

export const dealers = [
  { id: 'D-101', name: 'GreenVolt Jaipur', region: 'North', status: 'Active', revenue: 420000, outstanding: 15000, manager: 'Amit Singh' },
  { id: 'D-102', name: 'EcoRide Lucknow', region: 'North', status: 'Active', revenue: 385000, outstanding: 24000, manager: 'Pooja Verma' },
  { id: 'D-103', name: 'Metro EV Pune', region: 'West', status: 'Pending', revenue: 275000, outstanding: 62000, manager: 'Rohan Kulkarni' },
  { id: 'D-104', name: 'BatteryLoop Hyderabad', region: 'South', status: 'Active', revenue: 514000, outstanding: 18000, manager: 'Kavya Reddy' },
  { id: 'D-105', name: 'Urban eScoot Chennai', region: 'South', status: 'Suspended', revenue: 229000, outstanding: 84000, manager: 'Sundar Nair' },
];

export const inventoryData = [
  { sku: 'EV-CTX-001', product: 'CityFlow X1', warehouse: 'Central Hub', stock: 642, reorderPoint: 200, status: 'Healthy' },
  { sku: 'EV-CTX-002', product: 'Volt Sprint', warehouse: 'North Warehouse', stock: 132, reorderPoint: 180, status: 'Low Stock' },
  { sku: 'EV-CTX-003', product: 'EcoMax Pro', warehouse: 'West Hub', stock: 890, reorderPoint: 200, status: 'Healthy' },
  { sku: 'EV-CTX-004', product: 'AeroRide Mini', warehouse: 'South Hub', stock: 88, reorderPoint: 120, status: 'Critical' },
  { sku: 'EV-CTX-005', product: 'Urban Glide', warehouse: 'Dealer Stock', stock: 377, reorderPoint: 150, status: 'Healthy' },
];

export const salesData = [
  { id: 'INV-2841', dealer: 'GreenVolt Jaipur', product: 'CityFlow X1', quantity: 14, amount: 42800, status: 'Approved' },
  { id: 'INV-2844', dealer: 'EcoRide Lucknow', product: 'Volt Sprint', quantity: 9, amount: 31150, status: 'Pending' },
  { id: 'INV-2849', dealer: 'Metro EV Pune', product: 'Urban Glide', quantity: 12, amount: 36240, status: 'Approved' },
  { id: 'INV-2858', dealer: 'BatteryLoop Hyderabad', product: 'EcoMax Pro', quantity: 21, amount: 53800, status: 'Approved' },
  { id: 'INV-2866', dealer: 'Urban eScoot Chennai', product: 'AeroRide Mini', quantity: 7, amount: 18750, status: 'Rejected' },
];

export const returnData = [
  { id: 'RET-1042', dealer: 'GreenVolt Jaipur', product: 'CityFlow X1', quantity: 3, reason: 'Battery voltage drop during charging', status: 'Awaiting Sales Review' },
  { id: 'RET-1046', dealer: 'Metro EV Pune', product: 'AeroRide Mini', quantity: 2, reason: 'Brake assembly noise after 100 km', status: 'Finance Clearance' },
  { id: 'RET-1051', dealer: 'Urban eScoot Chennai', product: 'Urban Glide', quantity: 5, reason: 'Display flickering under sunlight', status: 'Warehouse Approval' },
];

export const employees = [
  { name: 'Amit Singh', role: 'Regional Manager', location: 'Jaipur', attendance: '96%' },
  { name: 'Riya Sharma', role: 'Sales Associate', location: 'Delhi', attendance: '91%' },
  { name: 'Farhan Ali', role: 'Warehouse Supervisor', location: 'Lucknow', attendance: '94%' },
  { name: 'Meera Nair', role: 'Finance Analyst', location: 'Bengaluru', attendance: '98%' },
  { name: 'Vikram Rao', role: 'After-Sales Technician', location: 'Hyderabad', attendance: '89%' },
];

export const vendorData = [
  { name: 'Nova Battery Labs', category: 'Battery', amount: 185000, status: 'Approved' },
  { name: 'Torque Components', category: 'Motor', amount: 220000, status: 'Pending' },
  { name: 'GreenCharge Systems', category: 'Charging', amount: 142000, status: 'Approved' },
];

export const paymentData = [
  { invoice: 'PAY-9082', dealer: 'GreenVolt Jaipur', amount: 120000, status: 'Paid', due: 'Completed' },
  { invoice: 'PAY-9105', dealer: 'Metro EV Pune', amount: 93200, status: 'Pending', due: '12 days' },
  { invoice: 'PAY-9137', dealer: 'BatteryLoop Hyderabad', amount: 164400, status: 'Approved', due: '3 days' },
];

export const recentTransactions = [
  { type: 'Sale', customer: 'Urban Glide', amount: '$18,600', time: '12 mins ago' },
  { type: 'Payment', customer: 'GreenVolt Jaipur', amount: '$11,500', time: '1 hr ago' },
  { type: 'Return', customer: 'Metro EV Pune', amount: '$3,200', time: '2 hrs ago' },
  { type: 'Transfer', customer: 'North Warehouse', amount: '$6,400', time: '4 hrs ago' },
];

export const regionPerformance = [
  { region: 'North', sales: 332000, target: 350000 },
  { region: 'West', sales: 286000, target: 300000 },
  { region: 'South', sales: 401000, target: 370000 },
  { region: 'East', sales: 251000, target: 280000 },
];

export const appNav = [
  { label: 'Dashboard', href: '/dashboard', icon: 'layout' },
  { label: 'Dealers', href: '/dealers', icon: 'users' },
  { label: 'Inventory', href: '/inventory', icon: 'warehouse' },
  { label: 'Sales', href: '/sales', icon: 'sales' },
  { label: 'Finance', href: '/finance', icon: 'cash' },
  { label: 'Returns', href: '/returns', icon: 'undo' },
  { label: 'Employees', href: '/employees', icon: 'briefcase' },
  { label: 'Reports', href: '/reports', icon: 'chart' },
];
