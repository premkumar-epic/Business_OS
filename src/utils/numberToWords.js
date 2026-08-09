export function numberToWordsIndian(num) {
  if (num === 0) return "Rupees Zero Only";
  if (!num || isNaN(num)) return "";

  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(n) {
    let str = "";
    if (n > 19) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : " ");
    } else {
      str += a[n];
    }
    return str;
  }

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let output = "";

  const crore = Math.floor(integerPart / 10000000);
  let rem = integerPart % 10000000;

  const lakh = Math.floor(rem / 100000);
  rem %= 100000;

  const thousand = Math.floor(rem / 1000);
  rem %= 1000;

  const hundred = Math.floor(rem / 100);
  rem %= 100;

  if (crore > 0) {
    output += inWords(crore) + "Crore ";
  }
  if (lakh > 0) {
    output += inWords(lakh) + "Lakh ";
  }
  if (thousand > 0) {
    output += inWords(thousand) + "Thousand ";
  }
  if (hundred > 0) {
    output += inWords(hundred) + "Hundred ";
  }
  if (rem > 0) {
    if (output !== "") output += "and ";
    output += inWords(rem);
  }

  output = "Rupees " + output.trim();
  if (decimalPart > 0) {
    output += " and " + inWords(decimalPart).trim() + " Paise";
  }
  output += " Only";

  return output;
}
