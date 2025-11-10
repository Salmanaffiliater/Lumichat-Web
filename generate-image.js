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
    const { prompt, model } = JSON.parse(event.body);
    
    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prompt required' })
      };
    }
    
    const imageModel = model || 'stability';
    let imageUrl;
    
    if (imageModel === 'stability') {
      imageUrl = await generateStabilityImage(prompt);
    } else if (imageModel === 'dalle') {
      imageUrl = await generateDALLEImage(prompt);
    } else {
      throw new Error('Invalid image model');
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        imageUrl: imageUrl,
        prompt: prompt
      })
    };
    
  } catch (error) {
    console.error('Image Generation Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message || 'Image generation failed'
      })
    };
  }
};

async function generateStabilityImage(prompt) {
  const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`
    },
    body: JSON.stringify({
      text_prompts: [{ text: prompt, weight: 1 }],
      cfg_scale: 7,
      height: 1024,
      width: 1024,
      steps: 30,
      samples: 1
    })
  });
  
  if (!response.ok) throw new Error('Stability AI failed');
  
  const data = await response.json();
  return `data:image/png;base64,${data.artifacts[0].base64}`;
}

async function generateDALLEImage(prompt) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024'
    })
  });
  
  if (!response.ok) throw new Error('DALL-E failed');
  
  const data = await response.json();
  return data.data[0].url;
}
