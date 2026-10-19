import React from 'react';
import { createRoot } from 'react-dom/client';
import SceneGarden from '../../app/components/SceneGarden';
import GuestbookManager from '../../app/admin/guestbook/GuestbookManager';
import OwnerAccess from './OwnerAccess';
import './base.css';
const route = window.location.pathname;
function Manager() {
 const logout = async () => { const response = await fetch('/api/auth/logout', { method: 'POST' }); if (response.ok) window.location.assign('/login'); };
 return <><GuestbookManager/><button className="ag-logout" onClick={logout}>退出登录</button></>;
}
createRoot(document.getElementById('root')!).render(route === '/admin/guestbook' ? <Manager/> : route === '/login' || route === '/setup' ? <OwnerAccess setup={route === '/setup'}/> : <SceneGarden/>);
