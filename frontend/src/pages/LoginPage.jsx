

export default function LoginPage() {
  return (
    <div className="login-container">
      <h2 className='text-blue-500'>Login</h2>
<h2 className="text-3xl font-bold text-green-600">Login Page Test</h2>

      <form>
        <div className="input-group">
          <label>Email</label>
          <input type="email" placeholder="Enter your email" />
        </div>

        <div className="input-group">
          <label>Password</label>
          <input type="password" placeholder="Enter your password" />
        </div>

        <button className="btn">Login</button>
      </form>
    </div>
  );
}
