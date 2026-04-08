/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import MobileLayout from "./components/layout/MobileLayout";
import BoardList from "./pages/BoardList";
import ThreadList from "./pages/ThreadList";
import ThreadDetail from "./pages/ThreadDetail";
import Following from "./pages/Following";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import { SettingsProvider } from "./contexts/SettingsContext";

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MobileLayout />}>
            <Route index element={<BoardList />} />
            <Route path="following" element={<Following />} />
            <Route path="messages" element={<Messages />} />
            <Route path="profile" element={<Profile />} />
            <Route path="board/:id" element={<ThreadList />} />
            <Route path="thread/:id" element={<ThreadDetail />} />
            <Route path="*" element={<div className="p-8 text-center">页面开发中...</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  );
}
