import React, { useState } from 'react';
import { Board } from '../services/ngaApi';

interface HotBoardEditModalProps {
  board?: Board;
  onSave: (board: Board) => void;
  onClose: () => void;
}

export function HotBoardEditModal({ board, onSave, onClose }: HotBoardEditModalProps) {
  const [id, setId] = useState(board?.id || '');
  const [name, setName] = useState(board?.name || '');
  const [description, setDescription] = useState(board?.description || '');
  const [icon, setIcon] = useState(board?.icon || '📌');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !name) return;
    onSave({ id, name, description, icon });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="font-semibold">{board ? '编辑板块' : '添加板块'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">板块ID (fid)</label>
            <input 
              type="text" 
              value={id} 
              onChange={e => setId(e.target.value)} 
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">名称</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">描述 (可选)</label>
            <input 
              type="text" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">图标 (Emoji)</label>
            <input 
              type="text" 
              value={icon} 
              onChange={e => setIcon(e.target.value)} 
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg">取消</button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-amber-500 hover:bg-amber-600 rounded-lg">保存</button>
          </div>
        </form>
      </div>
    </div>
  );
}
