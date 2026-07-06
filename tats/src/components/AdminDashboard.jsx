import { Building2Icon, Calendar1Icon, FileTextIcon, UsersIcon} from "lucide-react"
// import { Link } from "react-router-dom";

const AdminDashboard = ({data}) => {
    const stats =[
        {
            icon: UsersIcon,
            value: data.totalEmployees,
            label:"Total Employees",
            description:"Active workforce",
        },
        {
            icon: Building2Icon,
            value: data.totalDepartments,
            label:"Departments",
            description:"Organization units",
        },
        {
            icon:Calendar1Icon,
            value: data.todayAttendance,
            label:"Today's Attendance",
            description:"Checked in today",
        },
                {
            icon:FileTextIcon,
            value: data.pendingLeaves,
            label:"Pending Leaves",
            description:"Awaiting Approval",
        },
    ]


  return (
        <div className="animate-fade-in">
        <div className="page-header"> 
            <h1 className='page-title'>Dashboard</h1>
            <p className="page-subtitle"> Welcome back, Admin</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
            {stats.map((s)=>(
                <div key={s.label} className="card card-hover p-5 sm:p-6 
                relative overflow-hidden group flex items-center justify-between">
                    <div>
                        <div className="absolute left-0 top-0 bottom-0 w-1 
                        rounded-r-full bg-slate-500/70 group-hover:bg-indigo-500/70"/>
                        <p className="text-sm font-medium text-slate-700">{s.label}</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>
                    </div>
                    <s.icon className="size-10 p-2.5 rounded-lg
                    bg-slate-100 text-slate-600 group-hover:bg-indigo-50
                    group-hover:text-indigo-600 transition-colors duration-200"/>

                </div>
            ))}
        </div>

        {/* <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/attendance" className='btn-primary text-center
            inline-flex items-center justify-center gap-2 '>
                Mark Attendance <ArrowRightIcon className='w-4 h-4 '/>
            </Link>

            <Link to="/leave" className='btn-secondary text-center'>
            Apply for Leave
            </Link>
        </div> */}
        
    </div>

  )
}

export default AdminDashboard