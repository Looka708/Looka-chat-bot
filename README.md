# 🤖 Looka AI - Intelligent Chat Assistant

<div align="center">

![Looka AI](logo.svg)

**A modern, feature-rich AI chatbot powered by GLM 4.5 Air**

[![Made with Love](https://img.shields.io/badge/Made%20with-❤️-red.svg)](https://github.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-success.svg)](https://github.com)

[Live Demo](#) • [Features](#features) • [Installation](#installation) • [Documentation](#documentation)

</div>

---

## ✨ Features

### 🎯 Core Capabilities
- 💬 **Real-time AI Chat** - Powered by GLM 4.5 Air (90k token context)
- 📁 **File Upload** - Support for images, PDFs, documents
- 🎨 **Image Generation** - Built-in image creation capability
- 💾 **Chat History** - Automatic conversation saving with Supabase
- 🔄 **Auto-cleanup** - Removes chats older than 7 days
- 📱 **Responsive Design** - Works on all devices

### 🎨 Modern UI/UX
- ✨ Fluid background animation
- 🌊 Smooth transitions and animations
- 🎭 Glass-morphism design elements
- 🎯 ChatGPT-like interface
- 📊 File preview badges
- ⚡ Loading animations with bouncing dots

### 🔒 Privacy & Storage
- 🗄️ Supabase integration for chat persistence
- 🔐 Secure API key management
- 🗑️ Automatic data cleanup (7-day retention)
- 📦 Local file handling

---

## 🚀 Quick Start

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- [Supabase Account](https://supabase.com) (for chat history)
- [OpenRouter API Key](https://openrouter.ai)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/looka-ai.git
cd looka-ai
```

2. **Configure Environment Variables**

Create a `.env.local` file:
```env
NEXT_PUBLIC_OPENROUTER_API_KEY=your_openrouter_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. **Set up Supabase Database**

Run this SQL in your Supabase dashboard:
```sql
-- Create chats table
CREATE TABLE chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  messages JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_chats_created_at ON chats(created_at DESC);

-- Enable Row Level Security
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth needs)
CREATE POLICY "Enable all access for chats" ON chats
  FOR ALL USING (true);

-- Function to auto-delete old chats (older than 7 days)
CREATE OR REPLACE FUNCTION delete_old_chats()
RETURNS void AS $$
BEGIN
  DELETE FROM chats
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule automatic cleanup (requires pg_cron extension)
SELECT cron.schedule(
  'delete-old-chats',
  '0 0 * * *', -- Run daily at midnight
  $$SELECT delete_old_chats()$$
);
```

4. **Open the Application**
```bash
# Simply open index.html in your browser
open index.html
# or
start index.html
# or double-click index.html
```

---

## 📖 Usage

### Starting a Chat
1. Open the application in your browser
2. Type your message in the input box
3. Press `Enter` or click **Send**

### Uploading Files
1. Click the 📎 **paperclip icon**
2. Select files (images, PDFs, docs)
3. Files appear as badges above the input
4. Send your message with context

### Generating Images
1. Type your image description
2. Click the 🖼️ **gallery icon**
3. Looka will create/describe your image

### Managing Chat History
- **New Chat**: Click "New Chat" button
- **View History**: Click on any previous chat in the sidebar
- **Delete Chat**: Click the delete icon on any chat
- **Auto-delete**: Chats older than 7 days are automatically removed

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3 (Tailwind), JavaScript (ES6+)
- **AI Model**: GLM 4.5 Air via OpenRouter
- **Database**: Supabase (PostgreSQL)
- **Animation**: WebGL Fluid Simulation
- **Icons**: Iconify
- **Font**: Inter

---

## 📁 Project Structure

```
looka-ai/
├── index.html          # Main application file
├── logo.svg            # Looka logo
├── .env.local          # Environment variables (create this)
├── README.md           # This file
└── LICENSE             # MIT License
```

---

## 🎨 Customization

### Change AI Model
Edit the `model` parameter in `index.html`:
```javascript
model: 'z-ai/glm-4.5-air:free', // Change to your preferred model
```

### Adjust Token Limit
```javascript
max_tokens: 90000, // Modify as needed
```

### Change Retention Period
Update the Supabase function:
```sql
WHERE created_at < NOW() - INTERVAL '14 days'; -- Change to 14 days
```

---

## 🔧 Configuration

### OpenRouter API
Get your API key from [OpenRouter](https://openrouter.ai):
1. Sign up for an account
2. Navigate to API Keys
3. Generate a new key
4. Add to `.env.local`

### Supabase Setup
Get your credentials from [Supabase](https://supabase.com):
1. Create a new project
2. Go to Settings → API
3. Copy URL and anon key
4. Add to `.env.local`

---

## 📝 API Documentation

### Chat Endpoint
```javascript
POST https://openrouter.ai/api/v1/chat/completions
Headers:
  - Authorization: Bearer YOUR_API_KEY
  - Content-Type: application/json
Body:
  {
    "model": "z-ai/glm-4.5-air:free",
    "messages": [...],
    "temperature": 0.7,
    "max_tokens": 90000
  }
```

### Supabase Queries
```javascript
// Create chat
supabase.from('chats').insert({ title, messages })

// Load chats
supabase.from('chats').select('*').order('created_at', { ascending: false })

// Update chat
supabase.from('chats').update({ messages, updated_at: new Date() }).eq('id', chatId)

// Delete chat
supabase.from('chats').delete().eq('id', chatId)
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **GLM 4.5 Air** by Zhipu AI for the AI model
- **OpenRouter** for API access
- **Supabase** for database and backend
- **Tailwind CSS** for styling
- **Iconify** for beautiful icons

---

## 📧 Contact

**Made with ❤️ by Muhammad Umer**

- GitHub: [@yourusername](https://github.com/Looka708)
- Email: m.umer.looka@gmail.com
- Website: [yourwebsite.com](https://yourwebsite.com)

---

## 🎯 Roadmap

- [ ] Voice input/output
- [ ] Multi-language support
- [ ] Custom AI training
- [ ] Mobile app version
- [ ] Browser extension
- [ ] Team collaboration features
- [ ] Export to various formats
- [ ] Theme customization

---

<div align="center">

**⭐ Star this repo if you find it helpful!**

Made with ❤️ by **Muhammad Umer**

</div>
