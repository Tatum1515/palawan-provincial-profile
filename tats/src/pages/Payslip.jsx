import { useCallback, useEffect, useState } from "react"
import { dummyEmployeeData, dummyPayslipData} from "../assets/assets"
import Loading from "../components/Loading"
import PayslipList from "../components/payslip/PayslipList"
import GeneratePayslipsForm from "../components/payslip/GeneratePayslipsForm"
  
const Payslip = () => {

  const isAdmin = true;
  const [payslips, setPayslips] = useState(dummyPayslipData)
  const [employees] = useState(isAdmin ? dummyEmployeeData : [])
  const [loading, setLoading] = useState(true);

  const fetchPayslips = useCallback(async ()=>{
    setPayslips(dummyPayslipData)
  },[])

  useEffect(()=>{
    const t = setTimeout(()=> setLoading(false), 1000)
    return () => clearTimeout(t)
  },[])

if(loading) return <Loading/>

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="page-title">Payslips</h1>
          <p className="page-subtitle">{isAdmin ?"Generate and manage employee payslips" : "Your payslip history"}</p>
        </div>
        {isAdmin && <GeneratePayslipsForm employees={employees} onSuccess={fetchPayslips}/>} 
      </div>
    <PayslipList payslips={payslips} isAdmin={isAdmin}/>
    </div>
    
  )
}

export default Payslip