const GLITCH_CHARS = '!@#$%^&*()_+{}|:<>?~`-=[]\\;\',./1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM';

export const scrambleText = (text) => {
  let scrambled = '';
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ' ') {
      scrambled += ' ';
    } else {
      scrambled += GLITCH_CHARS.charAt(Math.floor(Math.random() * GLITCH_CHARS.length));
    }
  }
  return scrambled;
};
