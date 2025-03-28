function isEnPassant(fromRow, fromCol, toRow, toCol) {
    const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];
    if (!lastMove || lastMove.piece !== 'pawn') return false;
    const pawnRow = gameState.currentTurn === 'white' ? 3 : 4;
    return fromRow === pawnRow && toRow === pawnRow + (gameState.currentTurn === 'white' ? -1 : 1) &&
           Math.abs(toCol - fromCol) === 1 && lastMove.toRow === pawnRow && lastMove.fromRow === (pawnRow + (gameState.currentTurn === 'white' ? 2 : -2)) &&
           lastMove.toCol === toCol;
  }

  function isCastling(king, fromRow, fromCol, toRow, toCol) {
    if (fromRow !== toRow || Math.abs(toCol - fromCol) !== 2) return false;
    const color = king.dataset.color;
    const kingRow = color === 'white' ? 7 : 0;
    if (fromRow !== kingRow || fromCol !== 4) return false;

    const hasKingMoved = gameState.moveHistory.some(m => m.piece === 'king' && m.fromCol === 4 && m.fromRow === kingRow);
    if (hasKingMoved) return false;

    const rookCol = toCol > fromCol ? 7 : 0;
    const rookSquare = document.querySelector(`.square[data-row="${kingRow}"][data-col="${rookCol}"]`);
    const rook = rookSquare ? rookSquare.querySelector('.piece') : null;
    if (!rook || rook.dataset.type !== 'rook') {
      console.log('Castling invalid: no rook at', rookCol);
      return false;
    }

    const hasRookMoved = gameState.moveHistory.some(m => m.piece === 'rook' && m.fromCol === rookCol && m.fromRow === kingRow);
    if (hasRookMoved) return false;

    const direction = toCol > fromCol ? 1 : -1;
    for (let col = fromCol; col !== toCol + direction; col += direction) {
      const square = document.querySelector(`.square[data-row="${kingRow}"][data-col="${col}"]`);
      if (col !== fromCol && (!square || square.querySelector('.piece') || isSquareAttacked(kingRow, col, color === 'white' ? 'black' : 'white'))) {
        console.log('Castling blocked at', col);
        return false;
      }
    }

    return true;
  }

      
  function isPathClear(fromRow, fromCol, toRow, toCol) {
    const rowStep = fromRow === toRow ? 0 : (toRow > fromRow ? 1 : -1);
    const colStep = fromCol === toCol ? 0 : (toCol > fromCol ? 1 : -1);
    let row = fromRow + rowStep;
    let col = fromCol + colStep;

    while (row !== toRow || col !== toCol) {
      const square = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
      if (square && square.querySelector('.piece')) return false;
      row += rowStep;
      col += colStep;
    }
    return true;
  }

  function isSquareAttacked(row, col, byColor) {
    const pieces = Array.from(document.querySelectorAll(`.piece[data-color="${byColor}"]`));
    for (const piece of pieces) {
      if (isValidMove(piece, document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`))) {
        return true;
      }
    }
    return false;
  }

  function isInCheck(color) {
    const king = document.querySelector(`.piece[data-type="king"][data-color="${color}"]`);
    if (!king) throw new Error(`No ${color} king found`);
    const kingRow = parseInt(king.parentElement.dataset.row);
    const kingCol = parseInt(king.parentElement.dataset.col);
    return isSquareAttacked(kingRow, kingCol, color === 'white' ? 'black' : 'white');
  }

  function isInCheckmate(color) {
    if (!isInCheck(color)) return false;
    const pieces = Array.from(document.querySelectorAll(`.piece[data-color="${color}"]`));
    for (const piece of pieces) {
      const fromRow = parseInt(piece.parentElement.dataset.row);
      const fromCol = parseInt(piece.parentElement.dataset.col);
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const target = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
          if (isValidMove(piece, target)) {
            // Simulate move
            const originalSquare = piece.parentElement;
            const targetPiece = target.querySelector('.piece');
            if (targetPiece) target.removeChild(targetPiece);
            target.appendChild(piece);
            const stillInCheck = isInCheck(color);
            originalSquare.appendChild(piece);
            if (targetPiece) target.appendChild(targetPiece);
            if (!stillInCheck) return false;
          }
        }
      }
    }
    return true;
  }

  function isValidMove(piece, targetSquare) {
    if (!piece || !targetSquare) return false;
    const fromRow = parseInt(piece.parentElement.dataset.row);
    const fromCol = parseInt(piece.parentElement.dataset.col);
    const toRow = parseInt(targetSquare.dataset.row);
    const toCol = parseInt(targetSquare.dataset.col);
    const type = piece.dataset.type;
    const color = piece.dataset.color;
    const targetPiece = targetSquare.querySelector('.piece');
    const targetColor = targetPiece ? targetPiece.dataset.color : null;

    if (targetColor === color) return false;

    console.log(`Validating move: ${type} from (${fromRow},${fromCol}) to (${toRow},${toCol}), color: ${color}, player: ${gameState.playerSide}`);

    // Basic move validation
    let isMoveValid = false;
    switch (type) {
      case 'pawn':
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;
        if (color === gameState.playerSide) {
          console.log(`Pawn direction: ${direction}, startRow: ${startRow}, from: ${fromRow}, to: ${toRow}`);
          if (toCol === fromCol && toRow === fromRow + direction && !targetPiece) isMoveValid = isPathClear(fromRow, fromCol, toRow, toCol);
          if (toCol === fromCol && toRow === fromRow + 2 * direction && fromRow === startRow && !targetPiece) isMoveValid = isPathClear(fromRow, fromCol, toRow, toCol);
          if (Math.abs(toCol - fromCol) === 1 && toRow === fromRow + direction && (targetPiece || isEnPassant(fromRow, fromCol, toRow, toCol))) isMoveValid = true;
        }
        break;
      case 'rook':
        if (fromRow !== toRow && fromCol !== toCol) return false;
        isMoveValid = isPathClear(fromRow, fromCol, toRow, toCol);
        break;
      case 'bishop':
        if (Math.abs(fromRow - toRow) !== Math.abs(fromCol - toCol)) return false;
        isMoveValid = isPathClear(fromRow, fromCol, toRow, toCol);
        break;
      case 'queen':
        if ((fromRow === toRow || fromCol === toCol) || 
            (Math.abs(fromRow - toRow) === Math.abs(fromCol - toCol))) {
          isMoveValid = isPathClear(fromRow, fromCol, toRow, toCol);
        }
        break;
      case 'king':
        if (Math.abs(fromRow - toRow) <= 1 && Math.abs(fromCol - toCol) <= 1) isMoveValid = true;
        if (isCastling(piece, fromRow, fromCol, toRow, toCol)) isMoveValid = true;
        break;
      case 'knight':
        isMoveValid = (Math.abs(fromRow - toRow) === 2 && Math.abs(fromCol - toCol) === 1) ||
                      (Math.abs(fromRow - toRow) === 1 && Math.abs(fromCol - toCol) === 2);
        break;
      default:
        return false;
    }

    if (!isMoveValid) return false;

    // Simulate the move to check if it leaves the king in check
    const originalSquare = piece.parentElement;
    const targetPieceToRemove = targetSquare.querySelector('.piece');
    if (targetPieceToRemove) targetSquare.removeChild(targetPieceToRemove);
    targetSquare.appendChild(piece);

    const kingInCheck = isInCheck(color);
    console.log(`After move, ${color} king in check: ${kingInCheck}`);

    // Undo the move
    originalSquare.appendChild(piece);
    if (targetPieceToRemove) targetSquare.appendChild(targetPieceToRemove);

    // If the move leaves the king in check, it's illegal
    if (kingInCheck) {
      console.log(`Move blocked: leaves ${color} king in check`);
      return false;
    }

    return true;
  }
}