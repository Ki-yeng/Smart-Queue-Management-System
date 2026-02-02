import axios from "axios";


const API_URL = "http://localhost:5000/api/clearance";


export const getClearanceStatus = async (studentId) => {
const res = await axios.get(`${API_URL}/${studentId}`);
return res.data;
};