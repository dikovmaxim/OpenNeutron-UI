import React from 'react';
import { 
  Inbox, 
  FileText, 
  Send, 
  Star, 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  Tag, 
  Search, 
  Trash2, 
  Archive, 
  Clock, 
  MoveRight, 
  MoreVertical, 
  ChevronLeft, 
  Paperclip,
  Settings,
  Plus,
  RefreshCw,
  Mail,
  X
} from 'lucide-react';

const SidebarItem = ({ icon, label, badge, active, hasDropdown }) => (
  <div className={`flex items-center justify-between px-3 py-2 cursor-pointer rounded-md ${active ? 'bg-gray-800/50 text-white' : 'text-gray-300 hover:bg-gray-800/30'}`}>
    <div className="flex items-center gap-3">
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {badge && (
        <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-[#714DF9] text-white' : 'bg-gray-800 text-gray-300'}`}>
          {badge}
        </span>
      )}
      {hasDropdown && <ChevronRight className="w-4 h-4 text-gray-500" />}
    </div>
  </div>
);

const EmailItem = ({ avatar, avatarColor, sender, subject, date, active, isOfficial, hasAttachment }) => (
  <div className={`flex items-start gap-3 p-3 cursor-pointer border-b border-[#211F27] group ${active ? 'bg-[#714DF9]' : 'hover:bg-[#1E1C24]'}`}>
    <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 text-white font-medium text-sm ${avatarColor}`}>
      {avatar}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-2">
          <span className={`font-medium text-sm truncate ${active ? 'text-white' : 'text-gray-200'}`}>{sender}</span>
          {isOfficial && <span className="bg-[#3D2C8D] text-[#A68BFF] text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Официальный</span>}
        </div>
        <span className={`text-xs whitespace-nowrap ${active ? 'text-purple-100' : 'text-gray-500'}`}>{date}</span>
      </div>
      <div className="flex justify-between items-center">
         <p className={`text-sm truncate ${active ? 'text-white' : 'text-gray-400'}`}>
           {subject}
         </p>
         {hasAttachment && <Paperclip className={`w-4 h-4 ml-2 flex-shrink-0 ${active ? 'text-purple-200' : 'text-gray-500'}`} />}
      </div>
    </div>
  </div>
);

export default function App() {
  return (
    <div className="flex h-screen w-full bg-[#15131A] text-gray-300 font-sans overflow-hidden selection:bg-[#714DF9] selection:text-white">
      
      {/* 1. LEFT SIDEBAR */}
      <div className="w-64 flex flex-col border-r border-[#211F27] bg-[#15131A]">
        {/* Logo area */}
        <div className="h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-2 text-white font-semibold text-lg tracking-wide">
            <div className="w-6 h-6 bg-[#714DF9] rounded-sm flex items-center justify-center">
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-t-[8px] border-t-white border-r-[6px] border-r-transparent"></div>
            </div>
            Proton <span className="text-gray-300 font-normal">Mail</span>
          </div>
          <div className="grid grid-cols-2 gap-0.5 opacity-50 hover:opacity-100 cursor-pointer">
             <div className="w-1.5 h-1.5 border border-white rounded-sm"></div>
             <div className="w-1.5 h-1.5 border border-white rounded-sm"></div>
             <div className="w-1.5 h-1.5 border border-white rounded-sm"></div>
             <div className="w-1.5 h-1.5 border border-white rounded-sm"></div>
          </div>
        </div>

        {/* New Message Button */}
        <div className="px-3 pb-4 pt-2">
          <button className="w-full bg-[#714DF9] hover:bg-[#603FE5] text-white rounded-lg py-2.5 px-4 font-medium text-left transition-colors">
            Новое сообщение
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="px-2 space-y-0.5">
            <div className="flex items-center justify-between px-3 py-2 cursor-pointer rounded-md bg-[#1E1C24] text-white">
              <div className="flex items-center gap-3">
                <Inbox className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium">Входящие</span>
              </div>
              <div className="flex items-center gap-3">
                <RefreshCw className="w-3.5 h-3.5 text-gray-500 hover:text-white" />
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#714DF9] text-white">2026</span>
              </div>
            </div>
            
            <SidebarItem icon={<FileText className="w-4 h-4 text-gray-400" />} label="Черновики" />
            <SidebarItem icon={<Send className="w-4 h-4 text-gray-400" />} label="Отправленные" />
            <SidebarItem icon={<Star className="w-4 h-4 text-gray-400" />} label="Отмеченные *" badge="7" />
            
            <div className="my-2 border-t border-[#211F27]"></div>
            
            <SidebarItem icon={<ChevronRight className="w-4 h-4 text-gray-500" />} label="Подробнее" />
            <SidebarItem icon={<ChevronRight className="w-4 h-4 text-gray-500" />} label="Просмотры" />
            <SidebarItem icon={<Mail className="w-4 h-4 text-gray-400" />} label="Рассылки" />
            
            <div className="my-2 border-t border-[#211F27]"></div>
            
            {/* Folders */}
            <div className="flex items-center justify-between px-3 py-2 text-gray-400">
              <div className="flex items-center gap-1 cursor-pointer">
                <ChevronDown className="w-4 h-4" />
                <span className="text-sm">Папки</span>
              </div>
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 cursor-pointer hover:text-white" />
                <Settings className="w-4 h-4 cursor-pointer hover:text-white" />
              </div>
            </div>
            <SidebarItem icon={<Folder className="w-4 h-4 text-gray-500" />} label="Military" badge="2" />
            <SidebarItem icon={<Folder className="w-4 h-4 text-gray-500" />} label="JKU" badge="64" />
            
            <div className="my-2 border-t border-[#211F27]"></div>

            {/* Labels */}
            <div className="flex items-center justify-between px-3 py-2 text-gray-400">
              <div className="flex items-center gap-1 cursor-pointer">
                <ChevronRight className="w-4 h-4" />
                <span className="text-sm">Ярлыки</span>
              </div>
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 cursor-pointer hover:text-white" />
                <Settings className="w-4 h-4 cursor-pointer hover:text-white" />
              </div>
            </div>

          </div>
        </div>

        {/* Storage Footer */}
        <div className="p-4 border-t border-[#211F27] text-xs text-gray-500">
          <div className="flex justify-between items-center mb-2">
            <span className="opacity-0">«</span>
            <ChevronLeft className="w-4 h-4 hover:text-white cursor-pointer" />
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1 mb-2">
            <div className="bg-gray-400 h-1 rounded-full" style={{ width: '30%' }}></div>
          </div>
          <div className="flex justify-between">
            <span><strong className="text-gray-300">292.99 МБ</strong> / 1.00 ГБ</span>
            <span>5.0.107.8</span>
          </div>
        </div>
      </div>


      {/* 2. MIDDLE EMAIL LIST */}
      <div className="flex flex-col w-[35%] min-w-[380px] border-r border-[#211F27] bg-[#15131A]">
        
        {/* Search Bar */}
        <div className="p-2 border-b border-[#211F27] h-14 flex items-center">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              className="w-full bg-[#201E25] text-sm text-white rounded-md py-2 pl-9 pr-4 outline-none border border-transparent focus:border-[#714DF9] transition-colors placeholder-gray-500" 
              placeholder="Поиск сообщений" 
            />
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#211F27] text-gray-400 bg-[#15131A]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 cursor-pointer">
              <div className="w-4 h-4 border border-gray-500 rounded-[3px]"></div>
              <ChevronDown className="w-3 h-3" />
            </div>
            <Trash2 className="w-4 h-4 cursor-pointer hover:text-white" />
            <Archive className="w-4 h-4 cursor-pointer hover:text-white" />
            <Search className="w-4 h-4 cursor-pointer hover:text-white" />
            <MoveRight className="w-4 h-4 cursor-pointer hover:text-white" />
            <Tag className="w-4 h-4 cursor-pointer hover:text-white" />
            <Clock className="w-4 h-4 cursor-pointer hover:text-white" />
          </div>
          <div className="flex items-center gap-3 text-xs">
             <span>1/57</span>
             <div className="flex items-center gap-1">
               <ChevronLeft className="w-4 h-4 opacity-50 cursor-not-allowed" />
               <ChevronRight className="w-4 h-4 cursor-pointer hover:text-white" />
             </div>
             <MoreVertical className="w-4 h-4 cursor-pointer hover:text-white ml-2" />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-end gap-3 px-3 py-2 text-[11px] text-gray-400 border-b border-[#211F27] bg-[#15131A] font-medium tracking-wide">
           <span className="bg-gray-700/40 text-gray-200 px-2.5 py-1 rounded cursor-pointer hover:bg-gray-700/60 transition-colors">Все</span>
           <span className="cursor-pointer hover:text-gray-200 transition-colors">Прочитанные</span>
           <span className="cursor-pointer hover:text-gray-200 transition-colors">Непрочитанные</span>
           <span className="cursor-pointer hover:text-gray-200 transition-colors">С вложениями</span>
           <MoreVertical className="w-4 h-4" />
        </div>

        {/* Promo Banner */}
        <div className="bg-[#1C153B] text-sm px-4 py-3 border-b border-[#211F27] flex justify-between items-start gap-4">
          <p className="text-[#A68BFF] leading-snug">
            Обновите аккаунт чтобы поддержать конфиденциальность и получить доступ к большему количеству функций.
          </p>
          <div className="flex items-center gap-3 flex-shrink-0">
             <button className="text-white font-medium hover:underline text-sm">Улучшить</button>
             <X className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white" />
          </div>
        </div>

        {/* Email List Items */}
        <div className="flex-1 overflow-y-auto">
          <EmailItem 
            avatar={
              <div className="flex items-center gap-0.5">
                <div className="w-1.5 h-3 bg-white"></div><div className="w-1.5 h-3 bg-white"></div>
              </div>
            } 
            avatarColor="bg-[#0055D4]" 
            sender="PaysafeCard Info" 
            subject="Important Reminder" 
            date="10:58 ДП" 
          />
          <EmailItem 
            avatar="R" 
            avatarColor="bg-gray-500/30 text-gray-300" 
            sender="Revolut" 
            subject="[3] New virtual Zodiac cards that align with your sign ♍" 
            date="Вчера" 
            active 
          />
          <EmailItem 
            avatar="ÖH" 
            avatarColor="bg-gray-600/50 text-gray-300 text-xs" 
            sender="Österreichische Hochschüler_innenschaft" 
            subject="Hast du deinen ÖH-Beitrag schon einbezahlt?" 
            date="Вчера" 
          />
          <EmailItem 
            avatar="P" 
            avatarColor="bg-white text-black font-bold" 
            sender="Proton" 
            isOfficial 
            subject="Spring privacy refresh: Get 40% off Mail Plus" 
            date="среда" 
            hasAttachment
          />
          <EmailItem 
            avatar="R" 
            avatarColor="bg-gray-600/50 text-gray-300" 
            sender="Revolut" 
            subject="Our 2025 Annual Report is here" 
            date="вторник" 
          />
          <EmailItem 
            avatar={<span className="text-white font-serif italic text-lg text-center">T</span>} 
            avatarColor="bg-[#E20074]" 
            sender="Magenta" 
            subject="Magenta Moments Jubiläum mit neuen Gutscheinkarten und vielen Preisen." 
            date="вторник" 
          />
          <EmailItem 
            avatar="R" 
            avatarColor="bg-gray-600/50 text-gray-300" 
            sender="Revolut" 
            subject="Only 8 days left to earn € 80" 
            date="понедельник" 
          />
          <EmailItem 
            avatar="VT" 
            avatarColor="bg-gray-600/50 text-gray-300 text-[10px]" 
            sender="Vereinigung ehemaliger Theresianisten" 
            subject="Pubquiz am Mo, 13.04.2026 – Motto: Money, Power, High Society" 
            date="понедельник" 
          />
          <EmailItem 
            avatar="R" 
            avatarColor="bg-gray-600/50 text-gray-300" 
            sender="Revolut" 
            subject="Updates to our Privacy Notice" 
            date="мар. 20" 
          />
          <EmailItem 
             avatar="1" 
             avatarColor="bg-yellow-400 text-black font-bold" 
             sender="Alpaca Support" 
             subject="Upcoming SEC Fee Update Effective April 4, 2026" 
             date="мар. 19" 
           />
          <EmailItem 
             avatar={<span className="text-white font-serif italic text-lg text-center">T</span>} 
             avatarColor="bg-[#E20074]" 
             sender="Magenta" 
             subject="🐰🥚Deal: Samsung Galaxy S26 um € 6 mtl. Rate*" 
             date="мар. 18" 
           />
        </div>
      </div>

      {/* 3. RIGHT EMAIL VIEW (PLACEHOLDER) */}
      <div className="flex-1 bg-[#100F14] flex flex-col items-center justify-center text-gray-600">
         <Mail className="w-16 h-16 mb-4 opacity-20" />
         <h2 className="text-xl font-medium text-gray-400 mb-2">Ничего не выбрано</h2>
         <p className="text-sm">Выберите письмо для чтения</p>
         
         {/* Invisible structural guide for where the email would mount */}
         <div className="mt-10 px-6 py-4 border border-dashed border-gray-800 rounded-lg w-1/2 flex items-center justify-center bg-[#15131A]/50">
           <span className="text-xs text-gray-600">[ Email Content Viewing Area Placeholder ]</span>
         </div>
      </div>

    </div>
  );
}
