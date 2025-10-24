export function formatPhoneNumber(input: string): string {
  let cleaned = input.replace(/\D/g, '');
  
  if (cleaned.startsWith('880')) {
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('88')) {
    cleaned = '0' + cleaned.substring(2);
  }
  
  if (cleaned.startsWith('0')) {
    return cleaned.substring(0, 11);
  }
  
  if (cleaned.length === 10 && cleaned.startsWith('1')) {
    cleaned = '0' + cleaned;
  }
  
  return cleaned.substring(0, 11);
}
