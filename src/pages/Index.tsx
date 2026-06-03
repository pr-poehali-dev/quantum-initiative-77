import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

const AUTH_URL = "https://functions.poehali.dev/cbf02c49-a825-4d9c-adb1-aa46136f66cf";
const MESSAGES_URL = "https://functions.poehali.dev/19c7a9f4-aab1-4f6d-875a-751bf96353e6";

const COLORS = [
  "from-purple-500 to-pink-500",
  "from-green-500 to-teal-500",
  "from-blue-500 to-purple-500",
  "from-orange-500 to-red-500",
  "from-cyan-500 to-blue-500",
  "from-yellow-500 to-orange-500",
];

function getColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

interface Message {
  id: number;
  text: string;
  created_at: string;
  user_name: string;
  avatar_letter: string;
}

interface User {
  id: number;
  name: string;
  avatar_letter: string;
  phone: string;
}

export default function Index() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("xeex_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authStep, setAuthStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [devCode, setDevCode] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadMessages() {
    try {
      const res = await fetch(`${MESSAGES_URL}?channel=general`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (e) { console.error(e); }
  }

  async function sendOtp() {
    if (!phone.trim()) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_otp", phone }),
      });
      const data = await res.json();
      if (data.success) {
        setAuthStep("code");
        setDevCode(data.dev_code || "");
      } else {
        setAuthError(data.error || "Ошибка");
      }
    } catch {
      setAuthError("Ошибка соединения");
    }
    setAuthLoading(false);
  }

  async function verifyOtp() {
    if (!code.trim()) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_otp", phone, code }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        localStorage.setItem("xeex_user", JSON.stringify(data.user));
        setShowAuthModal(false);
        setAuthStep("phone");
        setPhone("");
        setCode("");
        setDevCode("");
      } else {
        setAuthError(data.error || "Неверный код");
      }
    } catch {
      setAuthError("Ошибка соединения");
    }
    setAuthLoading(false);
  }

  async function sendMessage() {
    if (!inputText.trim() || !user || sending) return;
    setSending(true);
    try {
      const res = await fetch(MESSAGES_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, text: inputText.trim(), channel: "general" }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
        setInputText("");
      }
    } catch (e) { console.error(e); }
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function logout() {
    setUser(null);
    localStorage.removeItem("xeex_user");
  }

  const onlineUsers = Array.from(
    new Map(messages.slice(-30).map((m) => [m.user_name, m])).values()
  ).slice(0, 8);

  return (
    <div className="min-h-screen bg-[#36393f] text-white overflow-x-hidden">
      {/* Модальное окно авторизации */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#36393f] rounded-xl w-full max-w-sm p-6 shadow-2xl border border-[#202225]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-white text-xl font-bold">
                  {authStep === "phone" ? "Вход в Xeex" : "Введите код"}
                </h2>
                <p className="text-[#b9bbbe] text-sm mt-1">
                  {authStep === "phone"
                    ? "Введите номер телефона"
                    : `Код отправлен на ${phone}`}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setAuthStep("phone");
                  setAuthError("");
                  setDevCode("");
                }}
                className="text-[#b9bbbe] hover:text-white"
              >
                <Icon name="X" className="w-5 h-5" />
              </button>
            </div>

            {authStep === "phone" ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[#b9bbbe] text-sm mb-1 block">Номер телефона</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                    placeholder="+7 900 123-45-67"
                    className="w-full bg-[#202225] text-white rounded-lg px-4 py-3 text-sm outline-none border border-[#40444b] focus:border-[#5865f2] placeholder-[#72767d]"
                    autoFocus
                  />
                </div>
                {authError && <p className="text-red-400 text-sm">{authError}</p>}
                <Button
                  className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white py-3"
                  onClick={sendOtp}
                  disabled={authLoading || !phone.trim()}
                >
                  {authLoading ? "Отправляем..." : "Получить код"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-[#b9bbbe] text-sm mb-1 block">Код из SMS</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full bg-[#202225] text-white rounded-lg px-4 py-3 text-sm outline-none border border-[#40444b] focus:border-[#5865f2] placeholder-[#72767d] text-center text-2xl tracking-widest"
                    autoFocus
                  />
                </div>
                {devCode && (
                  <div className="bg-[#2f3136] border border-[#5865f2] rounded-lg p-3 text-center">
                    <p className="text-[#b9bbbe] text-xs mb-1">Ваш код (тестовый режим):</p>
                    <p className="text-[#5865f2] text-2xl font-bold tracking-widest">{devCode}</p>
                  </div>
                )}
                {authError && <p className="text-red-400 text-sm">{authError}</p>}
                <Button
                  className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white py-3"
                  onClick={verifyOtp}
                  disabled={authLoading || code.length < 4}
                >
                  {authLoading ? "Проверяем..." : "Войти"}
                </Button>
                <button
                  onClick={() => {
                    setAuthStep("phone");
                    setAuthError("");
                    setDevCode("");
                  }}
                  className="w-full text-[#b9bbbe] text-sm hover:text-white text-center"
                >
                  ← Изменить номер
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Навигация */}
      <nav className="bg-[#2f3136] border-b border-[#202225] px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#5865f2] rounded-full flex items-center justify-center">
              <Icon name="MessageCircle" className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">Xeex</h1>
              <p className="text-xs text-[#b9bbbe] hidden sm:block">Социальная сеть для живого общения</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 bg-gradient-to-r ${getColor(user.name)} rounded-full flex items-center justify-center`}
                >
                  <span className="text-white text-sm font-bold">{user.avatar_letter}</span>
                </div>
                <span className="text-white text-sm font-medium">{user.name}</span>
                <Button
                  variant="ghost"
                  className="text-[#b9bbbe] hover:text-white hover:bg-[#40444b]"
                  onClick={logout}
                >
                  <Icon name="LogOut" className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="text-[#b9bbbe] hover:text-white hover:bg-[#40444b]"
                  onClick={() => setShowAuthModal(true)}
                >
                  <Icon name="LogIn" className="w-4 h-4 mr-2" />
                  Войти
                </Button>
                <Button
                  className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-6 py-2 rounded text-sm font-medium"
                  onClick={() => setShowAuthModal(true)}
                >
                  Зарегистрироваться
                </Button>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            className="sm:hidden text-[#b9bbbe] hover:text-white hover:bg-[#40444b] p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <Icon name="X" className="w-5 h-5" /> : <Icon name="Menu" className="w-5 h-5" />}
          </Button>
        </div>
        {mobileMenuOpen && (
          <div className="sm:hidden mt-4 pt-4 border-t border-[#202225]">
            <div className="flex flex-col gap-3">
              {user ? (
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 bg-gradient-to-r ${getColor(user.name)} rounded-full flex items-center justify-center`}>
                      <span className="text-white text-sm font-bold">{user.avatar_letter}</span>
                    </div>
                    <span className="text-white text-sm">{user.name}</span>
                  </div>
                  <Button variant="ghost" className="text-[#b9bbbe] hover:text-white" onClick={logout}>
                    <Icon name="LogOut" className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className="text-[#b9bbbe] hover:text-white hover:bg-[#40444b] justify-start"
                    onClick={() => { setShowAuthModal(true); setMobileMenuOpen(false); }}
                  >
                    <Icon name="LogIn" className="w-4 h-4 mr-2" />
                    Войти
                  </Button>
                  <Button
                    className="bg-[#5865f2] hover:bg-[#4752c4] text-white"
                    onClick={() => { setShowAuthModal(true); setMobileMenuOpen(false); }}
                  >
                    Зарегистрироваться
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Основной макет */}
      <div className="flex" style={{ height: "calc(100vh - 65px)" }}>
        {/* Серверная панель */}
        <div className="hidden lg:flex w-[72px] bg-[#202225] flex-col items-center py-3 gap-2 flex-shrink-0">
          <div className="w-12 h-12 bg-[#5865f2] rounded-2xl hover:rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer">
            <Icon name="MessageCircle" className="w-6 h-6 text-white" />
          </div>
          <div className="w-8 h-[2px] bg-[#36393f] rounded-full"></div>
          {["🔥", "🎮", "🎨", "💬"].map((emoji, i) => (
            <div
              key={i}
              className="w-12 h-12 bg-[#36393f] rounded-3xl hover:rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer hover:bg-[#5865f2] text-xl"
            >
              {emoji}
            </div>
          ))}
        </div>

        {/* Боковая панель каналов */}
        <div className={`${mobileSidebarOpen ? "block" : "hidden"} lg:flex w-full lg:w-60 bg-[#2f3136] flex-col flex-shrink-0`}>
          <div className="p-4 border-b border-[#202225] flex items-center justify-between">
            <h2 className="text-white font-semibold text-base">Xeex</h2>
            <Button
              variant="ghost"
              className="lg:hidden text-[#b9bbbe] hover:text-white hover:bg-[#40444b] p-1"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <Icon name="X" className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 p-2 overflow-y-auto">
            <div className="flex items-center gap-1 px-2 py-1 text-[#8e9297] text-xs font-semibold uppercase tracking-wide">
              <Icon name="ChevronRight" className="w-3 h-3" />
              <span>Каналы</span>
            </div>
            <div className="mt-1 space-y-0.5">
              {[
                { name: "общение", active: true },
                { name: "знакомства", active: false },
                { name: "новости", active: false },
                { name: "помощь", active: false },
              ].map((ch) => (
                <div
                  key={ch.name}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer ${
                    ch.active ? "bg-[#393c43] text-white" : "text-[#8e9297] hover:text-[#dcddde] hover:bg-[#393c43]"
                  }`}
                >
                  <Icon name="Hash" className="w-4 h-4" />
                  <span className="text-sm">{ch.name}</span>
                </div>
              ))}
            </div>
          </div>
          {user && (
            <div className="p-2 bg-[#292b2f] flex items-center gap-2">
              <div className={`w-8 h-8 bg-gradient-to-r ${getColor(user.name)} rounded-full flex items-center justify-center relative`}>
                <span className="text-white text-sm font-bold">{user.avatar_letter}</span>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#3ba55c] border-2 border-[#292b2f] rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{user.name}</div>
                <div className="text-[#3ba55c] text-xs">В сети</div>
              </div>
            </div>
          )}
        </div>

        {/* Чат */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Заголовок канала */}
          <div className="h-12 bg-[#36393f] border-b border-[#202225] flex items-center px-4 gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              className="lg:hidden text-[#8e9297] hover:text-[#dcddde] hover:bg-[#40444b] p-1 mr-2"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Icon name="Menu" className="w-5 h-5" />
            </Button>
            <Icon name="Hash" className="w-5 h-5 text-[#8e9297]" />
            <span className="text-white font-semibold">общение</span>
            <div className="w-px h-6 bg-[#40444b] mx-2 hidden sm:block"></div>
            <span className="text-[#8e9297] text-sm hidden sm:block">Живой чат · обновляется каждые 3 сек</span>
            <div className="ml-auto flex items-center gap-4">
              <Icon name="Users" className="w-5 h-5 text-[#b9bbbe] cursor-pointer hover:text-[#dcddde]" />
              <Icon name="Search" className="w-5 h-5 text-[#b9bbbe] cursor-pointer hover:text-[#dcddde]" />
            </div>
          </div>

          {/* Список сообщений */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-[#5865f2] rounded-full flex items-center justify-center mb-4">
                  <Icon name="MessageCircle" className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-white text-xl font-bold mb-2">Начните общение!</h3>
                <p className="text-[#b9bbbe] text-sm max-w-sm">
                  {user
                    ? "Напишите первое сообщение — его увидят все."
                    : "Войдите, чтобы написать сообщение."}
                </p>
                {!user && (
                  <Button
                    className="mt-4 bg-[#5865f2] hover:bg-[#4752c4]"
                    onClick={() => setShowAuthModal(true)}
                  >
                    Войти
                  </Button>
                )}
              </div>
            )}
            {messages.map((msg, i) => {
              const prevMsg = messages[i - 1];
              const sameUser = prevMsg?.user_name === msg.user_name;
              return (
                <div key={msg.id} className={`flex gap-3 group ${sameUser ? "mt-0.5" : "mt-4"}`}>
                  {!sameUser ? (
                    <div
                      className={`w-10 h-10 bg-gradient-to-r ${getColor(msg.user_name)} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}
                    >
                      <span className="text-white text-sm font-bold">{msg.avatar_letter}</span>
                    </div>
                  ) : (
                    <div className="w-10 flex-shrink-0 flex items-center justify-center">
                      <span className="text-[#72767d] text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {!sameUser && (
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-white font-medium text-sm hover:underline cursor-pointer">
                          {msg.user_name}
                        </span>
                        <span className="text-[#72767d] text-xs">{formatTime(msg.created_at)}</span>
                      </div>
                    )}
                    <p className="text-[#dcddde] text-sm leading-relaxed break-words hover:bg-[#2e3035] rounded px-1 -mx-1 transition-colors">
                      {msg.text}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Поле ввода сообщения */}
          <div className="p-3 sm:p-4 flex-shrink-0">
            {user ? (
              <div className="bg-[#40444b] rounded-lg flex items-center gap-2 px-4 py-2.5">
                <Icon name="Plus" className="w-5 h-5 text-[#b9bbbe] flex-shrink-0 cursor-pointer hover:text-white" />
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Сообщение #общение"
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder-[#72767d]"
                  disabled={sending}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputText.trim() || sending}
                  className="text-[#b9bbbe] hover:text-white disabled:opacity-30 transition-colors flex-shrink-0"
                >
                  <Icon name="Send" className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div
                className="bg-[#40444b] rounded-lg px-4 py-3 cursor-pointer hover:bg-[#484c54] transition-colors"
                onClick={() => setShowAuthModal(true)}
              >
                <span className="text-[#72767d] text-sm">Войдите, чтобы написать сообщение...</span>
              </div>
            )}
          </div>
        </div>

        {/* Правая панель участников */}
        <div className="hidden xl:flex w-60 bg-[#2f3136] p-4 flex-col flex-shrink-0">
          <h3 className="text-[#8e9297] text-xs font-semibold uppercase tracking-wide mb-3">
            Активные участники
          </h3>
          <div className="space-y-1">
            {onlineUsers.length === 0 ? (
              <p className="text-[#72767d] text-xs">Пока никого нет</p>
            ) : (
              onlineUsers.map((msg) => (
                <div
                  key={msg.user_name}
                  className="flex items-center gap-3 p-2 rounded hover:bg-[#36393f] cursor-pointer"
                >
                  <div
                    className={`w-8 h-8 bg-gradient-to-r ${getColor(msg.user_name)} rounded-full flex items-center justify-center relative`}
                  >
                    <span className="text-white text-sm font-bold">{msg.avatar_letter}</span>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#3ba55c] border-2 border-[#2f3136] rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{msg.user_name}</div>
                    <div className="text-[#3ba55c] text-xs">В сети</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}