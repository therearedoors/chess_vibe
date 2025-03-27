const { spawn } = require('child_process'); // Add this at the top (Electron/Node)

function startGame(side) {
    gameState.playerSide = side;
    document.getElementById('menu').style.display = 'none';
    document.querySelector('.menu-container').style.pointerEvents = 'none';
    document.querySelector('.menu-container').style.display = 'none';
    const gameDiv = document.getElementById('game');
    gameDiv.style.display = 'block';
    renderBoard(gameDiv);
  }

function resetGame() {
    const gameDiv = document.getElementById('game');
    gameDiv.style.transition = 'opacity 1s';
    gameDiv.style.opacity = '0';
    setTimeout(() => {
      gameDiv.innerHTML = '';
      gameDiv.style.display = 'none';
      gameDiv.style.opacity = '1';
      document.getElementById('menu').style.display = 'block';
      document.querySelector('.menu-container').style.display = 'flex';
      document.querySelector('.menu-container').style.pointerEvents = 'auto'; // Re-enable
      gameState.playerSide = null;
      gameState.currentTurn = 'white';
      gameState.moveHistory = [];
      gameState.gameOver = false;
      gameState.castlingRights = { // Reset to true
        white_kingside: true,
        white_queenside: true,
        black_kingside: true,
        black_queenside: true
      };
    }, 1000);
  }
    
  function renderBoard(container) {
    const board = document.createElement('div');
    board.className = 'chessboard';
    container.appendChild(board);

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = document.createElement('div');
        square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
        square.dataset.row = row;
        square.dataset.col = col;

        const piece = getPiece(row, col);
        if (piece) {
          const img = document.createElement('img');
          img.src = piece;
          img.className = 'piece';
          img.draggable = true;
          img.dataset.type = getPieceType(piece);
          img.dataset.color = getPieceColor(piece);
          img.ondragstart = (e) => {
            if (!gameState.gameOver && gameState.playerSide === gameState.currentTurn && 
                img.dataset.color === gameState.playerSide) {
              draggedPiece = img;
              e.dataTransfer.setData('text/plain', `${row},${col}`);
            }
          };
          square.appendChild(img);
        }

        square.ondragover = (e) => e.preventDefault();
        square.ondragenter = () => {
          if (isValidMove(draggedPiece, square)) {
            square.classList.add('drop-target');
          }
        };
        square.ondragleave = () => square.classList.remove('drop-target');
        square.ondrop = (e) => {
          e.preventDefault();
          square.classList.remove('drop-target');
          if (draggedPiece && isValidMove(draggedPiece, square)) {
            const fromRow = parseInt(draggedPiece.parentElement.dataset.row);
            const fromCol = parseInt(draggedPiece.parentElement.dataset.col);
            const toRow = parseInt(square.dataset.row);
            const toCol = parseInt(square.dataset.col);
            let captured = null;
            let promotion = null;

            if (draggedPiece.dataset.type === 'king' && Math.abs(toCol - fromCol) === 2) {
              const rookCol = toCol > fromCol ? 7 : 0;
              const rookSquare = document.querySelector(`.square[data-row="${fromRow}"][data-col="${rookCol}"]`);
              const rook = rookSquare.querySelector('.piece');
              const newRookCol = toCol > fromCol ? 5 : 3;
              const newRookSquare = document.querySelector(`.square[data-row="${fromRow}"][data-col="${newRookCol}"]`);
              newRookSquare.appendChild(rook);
              square.appendChild(draggedPiece);
              if (gameState.currentTurn === 'white') {
                gameState.castlingRights.white_kingside = false;
                gameState.castlingRights.white_queenside = false;
              } else {
                gameState.castlingRights.black_kingside = false;
                gameState.castlingRights.black_queenside = false;
              }
            } else {
              if (square.querySelector('.piece')) {
                captured = square.querySelector('.piece').dataset.type;
                square.removeChild(square.querySelector('.piece'));
              } else if (draggedPiece.dataset.type === 'pawn' && Math.abs(fromCol - toCol) === 1) {
                const enPassantRow = gameState.currentTurn === 'white' ? toRow + 1 : toRow - 1;
                const enPassantSquare = document.querySelector(`.square[data-row="${enPassantRow}"][data-col="${toCol}"]`);
                if (enPassantSquare && enPassantSquare.querySelector('.piece')) {
                  captured = enPassantSquare.querySelector('.piece').dataset.type;
                  enPassantSquare.removeChild(enPassantSquare.querySelector('.piece'));
                }
              }
              square.appendChild(draggedPiece);

              // Pawn promotion (simple: always queen for now)
              if (draggedPiece.dataset.type === 'pawn' && (toRow === 0 || toRow === 7)) {
                promotion = 'queen';
                draggedPiece.src = `./chess-assets/${gameState.currentTurn}/SVG_icons/queen.svg`;
                draggedPiece.dataset.type = 'queen';
              }

              // Update castling rights
              if (draggedPiece.dataset.type === 'king') {
                if (gameState.currentTurn === 'white') {
                  gameState.castlingRights.white_kingside = false;
                  gameState.castlingRights.white_queenside = false;
                } else {
                  gameState.castlingRights.black_kingside = false;
                  gameState.castlingRights.black_queenside = false;
                }
              } else if (draggedPiece.dataset.type === 'rook') {
                if (gameState.currentTurn === 'white') {
                  if (fromCol === 0) gameState.castlingRights.white_queenside = false;
                  if (fromCol === 7) gameState.castlingRights.white_kingside = false;
                } else {
                  if (fromCol === 0) gameState.castlingRights.black_queenside = false;
                  if (fromCol === 7) gameState.castlingRights.black_kingside = false;
                }
              }

              // En passant target
              if (draggedPiece.dataset.type === 'pawn' && Math.abs(fromRow - toRow) === 2) {
                gameState.enPassantTarget = [toRow + (gameState.currentTurn === 'white' ? 1 : -1), toCol];
              } else {
                gameState.enPassantTarget = null;
              }
            }

            gameState.moveHistory.push({
              fromRow: fromRow,
              fromCol: fromCol,
              toRow: toRow,
              toCol: toCol,
              piece: draggedPiece.dataset.type,
              captured,
              promotion
            });
            gameState.currentTurn = gameState.currentTurn === 'white' ? 'black' : 'white';
            draggedPiece = null;

            const checkedColor = gameState.currentTurn;
            if (isInCheckmate(checkedColor)) {
              alert(`${checkedColor} is in checkmate! ${gameState.playerSide} wins!`);
              gameState.gameOver = true;
              resetGame();
            } else if (isInCheck(checkedColor)) {
              alert(`${checkedColor} is in check!`);
              if (!gameState.gameOver && gameState.playerSide !== gameState.currentTurn) {
                setTimeout(makeAIMove, 500);
              }
            } else if (!gameState.gameOver && gameState.playerSide !== gameState.currentTurn) {
              setTimeout(makeAIMove, 500);
            }
          }
        };

        board.appendChild(square);
      }
    }
  }

  function makeAIMove() {
    const aiColor = gameState.playerSide === 'white' ? 'black' : 'white';
    
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    document.querySelectorAll('.piece').forEach(piece => {
      const row = parseInt(piece.parentElement.dataset.row);
      const col = parseInt(piece.parentElement.dataset.col);
      board[row][col] = {
        piece_type: piece.dataset.type,
        color: piece.dataset.color
      };
    });

    const gameStateForRust = {
      board,
      current_turn: aiColor,
      move_history: gameState.moveHistory,
      player_side: gameState.playerSide,
      castling_rights: gameState.castlingRights,
      en_passant_target: gameState.enPassantTarget
    };

    console.log('Sending to Rust:', JSON.stringify(gameStateForRust, null, 2));

    const rustAI = spawn('C:/git/rustprojects/chessAIvibe/target/release/chessAIvibe.exe', [], {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    const input = JSON.stringify(gameStateForRust);
    rustAI.stdin.write(input);
    rustAI.stdin.end();

    let output = '';
    rustAI.stdout.on('data', (data) => {
      output += data.toString();
    });

    rustAI.on('close', (code) => {
      console.log(`Rust AI exited with code ${code}, output: ${output}`);
      if (code === 0) {
        const move = JSON.parse(output);
        console.log(`AI move: ${JSON.stringify(move)}`);

        const piece = document.querySelector(
          `.square[data-row="${move.from_row}"][data-col="${move.from_col}"] .piece`
        );
        const target = document.querySelector(
          `.square[data-row="${move.to_row}"][data-col="${move.to_col}"]`
        );

        if (piece && target) {
          let captured = null;
          if (piece.dataset.type === 'king' && Math.abs(move.to_col - move.from_col) === 2) {
            const rookCol = move.to_col > move.from_col ? 7 : 0;
            const rookSquare = document.querySelector(`.square[data-row="${move.from_row}"][data-col="${rookCol}"]`);
            const rook = rookSquare ? rookSquare.querySelector('.piece') : null;
            const newRookCol = move.to_col > move.from_col ? 5 : 3;
            const newRookSquare = document.querySelector(`.square[data-row="${move.from_row}"][data-col="${newRookCol}"]`);
            if (rook && newRookSquare) newRookSquare.appendChild(rook);
            target.appendChild(piece);
            if (aiColor === 'white') {
              gameState.castlingRights.white_kingside = false;
              gameState.castlingRights.white_queenside = false;
            } else {
              gameState.castlingRights.black_kingside = false;
              gameState.castlingRights.black_queenside = false;
            }
          } else {
            if (target.querySelector('.piece')) {
              captured = target.querySelector('.piece').dataset.type;
              target.removeChild(target.querySelector('.piece'));
            } else if (piece.dataset.type === 'pawn' && Math.abs(move.from_col - move.to_col) === 1) {
              const enPassantRow = aiColor === 'white' ? move.to_row + 1 : move.to_row - 1;
              const enPassantSquare = document.querySelector(`.square[data-row="${enPassantRow}"][data-col="${move.to_col}"]`);
              if (enPassantSquare && enPassantSquare.querySelector('.piece')) {
                captured = enPassantSquare.querySelector('.piece').dataset.type;
                enPassantSquare.removeChild(enPassantSquare.querySelector('.piece'));
              }
            }
            target.appendChild(piece);

            // Handle promotion
            if (move.promotion) {
              piece.src = `./chess-assets/${aiColor}/SVG_icons/${move.promotion}.svg`;
              piece.dataset.type = move.promotion;
            }

            // Update castling rights
            if (piece.dataset.type === 'king') {
              if (aiColor === 'white') {
                gameState.castlingRights.white_kingside = false;
                gameState.castlingRights.white_queenside = false;
              } else {
                gameState.castlingRights.black_kingside = false;
                gameState.castlingRights.black_queenside = false;
              }
            } else if (piece.dataset.type === 'rook') {
              if (aiColor === 'white') {
                if (move.from_col === 0) gameState.castlingRights.white_queenside = false;
                if (move.from_col === 7) gameState.castlingRights.white_kingside = false;
              } else {
                if (move.from_col === 0) gameState.castlingRights.black_queenside = false;
                if (move.from_col === 7) gameState.castlingRights.black_kingside = false;
              }
            }

            // En passant target
            if (piece.dataset.type === 'pawn' && Math.abs(move.from_row - move.to_row) === 2) {
              gameState.enPassantTarget = [move.to_row + (aiColor === 'white' ? 1 : -1), move.to_col];
            } else {
              gameState.enPassantTarget = null;
            }
          }

          gameState.moveHistory.push({
            fromRow: move.from_row,
            fromCol: move.from_col,
            toRow: move.to_row,
            toCol: move.to_col,
            piece: piece.dataset.type,
            captured,
            promotion: move.promotion
          });
          gameState.currentTurn = gameState.playerSide;

          const checkedColor = gameState.currentTurn;
          if (isInCheckmate(checkedColor)) {
            alert(`${checkedColor} is in checkmate! ${aiColor} wins!`);
            gameState.gameOver = true;
            resetGame();
          } else if (isInCheck(checkedColor)) {
            alert(`${checkedColor} is in check!`);
          }
        } else {
          console.error('Failed to execute move:', { piece, target });
        }
      } else {
        console.error(`Rust AI failed with code ${code}`);
      }
    });
  }

function getPiece(row, col) {
    const pieces = {
      0: ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'],
      1: 'pawn',
      6: 'pawn',
      7: ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']
    };
    if (row in pieces) {
      const color = row < 2 ? 'black' : 'white';
      const piece = row === 1 || row === 6 ? pieces[row] : pieces[row][col];
      return `./chess-assets/${color}/SVG_icons/${piece}.svg`;
    }
    return null;
  }

  function getPieceType(src) {
    return src.split('/').pop().replace('.svg', '');
  }

  function getPieceColor(src) {
    return src.includes('black') ? 'black' : 'white';
  }

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

    switch (type) {
      case 'pawn':
        if (color === 'white') {
          if (toCol === fromCol && toRow === fromRow - 1 && !targetPiece) return isPathClear(fromRow, fromCol, toRow, toCol);
          if (toCol === fromCol && toRow === fromRow - 2 && fromRow === 6 && !targetPiece) return isPathClear(fromRow, fromCol, toRow, toCol);
          if (Math.abs(toCol - fromCol) === 1 && toRow === fromRow - 1 && (targetPiece || isEnPassant(fromRow, fromCol, toRow, toCol))) return true;
        } else {
          if (toCol === fromCol && toRow === fromRow + 1 && !targetPiece) return isPathClear(fromRow, fromCol, toRow, toCol);
          if (toCol === fromCol && toRow === fromRow + 2 && fromRow === 1 && !targetPiece) return isPathClear(fromRow, fromCol, toRow, toCol);
          if (Math.abs(toCol - fromCol) === 1 && toRow === fromRow + 1 && (targetPiece || isEnPassant(fromRow, fromCol, toRow, toCol))) return true;
        }
        return false;
      case 'rook':
        if (fromRow !== toRow && fromCol !== toCol) return false;
        return isPathClear(fromRow, fromCol, toRow, toCol);
      case 'bishop':
        if (Math.abs(fromRow - toRow) !== Math.abs(fromCol - toCol)) return false;
        return isPathClear(fromRow, fromCol, toRow, toCol);
      case 'queen':
        if ((fromRow === toRow || fromCol === toCol) || 
            (Math.abs(fromRow - toRow) === Math.abs(fromCol - toCol))) {
          return isPathClear(fromRow, fromCol, toRow, toCol);
        }
        return false;
      case 'king':
        if (Math.abs(fromRow - toRow) <= 1 && Math.abs(fromCol - toCol) <= 1) return true;
        return isCastling(piece, fromRow, fromCol, toRow, toCol);
      case 'knight':
        return (Math.abs(fromRow - toRow) === 2 && Math.abs(fromCol - toCol) === 1) ||
               (Math.abs(fromRow - toRow) === 1 && Math.abs(fromCol - toCol) === 2);
      default:
        return false;
    }
}