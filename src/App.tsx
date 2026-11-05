import { Link, Route, Routes } from 'react-router-dom'
import { Footer, Header } from './components/ui'
import Home from './pages/Home'
import Room from './pages/Room'

export default function App() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Header />
      <div id="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rooms/:gameId" element={<Room />} />
          <Route
            path="*"
            element={
              <main className="page-width error-page">
                <h1>A little off the page.</h1>
                <p>This page doesn’t exist, but a drawing party could.</p>
                <Link to="/" className="button">
                  Back to the studio
                </Link>
              </main>
            }
          />
        </Routes>
      </div>
      <Footer />
    </>
  )
}
