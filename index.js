const array1 = ['A1', 'A2', 'A3'];
const array2 = ['A1', 'A2', 'A3', 'A4', 'A5'];
const array3 = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'];

const summary = [array1, array2, array3];

let count = 1; // 求证奇数必定可以不拿最后一个数字
let winner = '';
let isContinue = true;
while (isContinue) {

    if (summary.length === 1 && summary[0].length === 1) {
        isContinue = false;
    }
}
