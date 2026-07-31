import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { Provider } from 'react-redux'
import { store } from './store'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './i18n/config'

const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '100000000000-dummyclientid.apps.googleusercontent.com'

if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
  console.warn(
    '[Groovra] VITE_GOOGLE_CLIENT_ID is not set. Google login will not work. ' +
    'Create a .env.local file with VITE_GOOGLE_CLIENT_ID=<your-client-id>.'
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <GoogleOAuthProvider clientId={googleClientId}>
        <App />
      </GoogleOAuthProvider>
    </Provider>
  </React.StrictMode>
)