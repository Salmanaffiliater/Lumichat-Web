const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    const { message, ai, history } = JSON.parse(event.body);
    
    if (!message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message required' })
      };
    }
    
    const aiType = ai || 'openai';
    let response;
    
    switch (aiType) {
      case 'openai':
        response = await callOpenAI(message, history);
        break;
      case 'gemini':
        response = await callGemini(message, history);
        break;
      case 'claude':
        response = await callClaude(message, history);
        break;
      default:
        throw new Error('Invalid AI type');
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        response: response,
        ai: aiType
      })
    };
    
  } catch (error) {
    console.error('Chat Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message || 'AI request failed'
      })
    };
  }
};

async function callOpenAI(message, history = []) {
  const messages = [
    { role: 'system', content: 'You are a helpful AI assistant named LumiChat AI.' },
    ...history,
    { role: 'user', content: message }
  ];
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    })
  });
  
  if (!response.ok) throw new Error('OpenAI API failed');
  
  const data = await response.json();
  return data.choices[0].message.content;
}

async function callGemini(message, history = []) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: message }] }]
    })
  });
  
  if (!response.ok) throw new Error('Gemini API failed');
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function callClaude(message, history = []) {
  const messages = [
    ...history,
    { role: 'user', content: message }
  ];
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 500,
      messages: messages
    })
  });
  
  if (!response.ok) throw new Error('Claude API failed');
  
  const data = await response.json();
  return data.content[0].text;
}
