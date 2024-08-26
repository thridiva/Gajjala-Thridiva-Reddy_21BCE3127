import React, { useState } from 'react';
import './App.css';

const App = () => {
  const initializeGrid = () => {
    const grid = Array(5)
      .fill(null)
      .map(() => Array(5).fill(null));

    grid[0] = ['A-P1', 'A-P2', 'A-P3', 'A-H1', 'A-H2'];
    grid[4] = ['B-P1', 'B-P2', 'B-P3', 'B-H1', 'B-H2'];

    return grid;
  };

  const [grid, setGrid] = useState(initializeGrid());
  const [selected, setSelected] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPlayer, setCurrentPlayer] = useState('A'); // Track the current player's turn
  const [winner, setWinner] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]); // State to track move history

  const handleCellClick = (row, col) => {
    if (winner) return; // Block any actions if the game has ended

    const cellValue = grid[row][col];

    // Toggle selection if the same cell is clicked
    if (selected && selected.row === row && selected.col === col) {
      setSelected(null);
      setErrorMessage('');
      return;
    }

    if (!selected) {
      if (cellValue) {
        if (gameStarted && !cellValue.startsWith(currentPlayer)) {
          setErrorMessage('It is not your turn.');
          return;
        }
        setSelected({ row, col, value: cellValue });
        setErrorMessage(''); // Clear any previous error messages
      } else {
        setErrorMessage('No character selected.');
      }
      return;
    }

    if (!gameStarted) {
      handlePreGameSwap(row, col);
    } else {
      // Prevent attacking a friendly character
      if (cellValue && cellValue.startsWith(currentPlayer)) {
        setErrorMessage('You cannot attack your own character.');
        return;
      }
      handlePostGameMove(row, col);
    }
  };

  const handlePreGameSwap = (row, col) => {
    const { row: selectedRow, col: selectedCol, value: selectedValue } = selected;

    // Allow swapping only within the same row
    if (selectedRow === row && grid[row][col] && selectedValue[0] === grid[row][col][0]) {
      const newGrid = grid.map((r) => r.slice());
      newGrid[selectedRow][selectedCol] = grid[row][col];
      newGrid[row][col] = selectedValue;
      setGrid(newGrid);
      setSelected(null);
    } else {
      setErrorMessage('Invalid swap. Try again.');
    }
  };

  const handlePostGameMove = (row, col, moveName) => {
    const { row: selectedRow, col: selectedCol, value: selectedValue } = selected;
    const [player, piece] = selectedValue.split('-');

    // Invalid Case: a. The specified character doesn't exist
    if (!selectedValue) {
      setErrorMessage("Invalid move: The specified character doesn't exist.");
      return;
    }

    // Invalid Case: b. The move would take the character out of bounds
    if (row < 0 || row >= 5 || col < 0 || col >= 5) {
      setErrorMessage('Invalid move: Out of bounds.');
      setSelected(null);
      return;
    }

    // Invalid Case: c. The move is not valid for the given character type
    const isValidMove = validateMove(piece, selectedRow, selectedCol, row, col);
    if (!isValidMove) {
      setErrorMessage('Invalid move: The move is not valid for this character.');
      return;
    }

    // Invalid Case: d. Prevent attacking a friendly character
    if (grid[row][col] && grid[row][col].startsWith(player)) {
      setErrorMessage('Invalid move: Cannot attack a friendly character.');
      return;
    }

    // Handle movement and capture logic
    const newGrid = grid.map((r) => r.slice());
    if (piece === 'H1' || piece === 'H2') {
      captureInPath(newGrid, selectedRow, selectedCol, row, col, player);
    }

    // Move the piece to the new position
    newGrid[row][col] = selectedValue;
    newGrid[selectedRow][selectedCol] = null;
    setGrid(newGrid);

    // Update move history with move name
    setMoveHistory([
      ...moveHistory,
      `${currentPlayer} moved ${selectedValue} using move ${moveName}`
    ]);

    setSelected(null);
    setErrorMessage(''); // Clear error message after a valid move

    checkForWinner(newGrid); // Check if the game is won after this move

    if (!winner) {
      togglePlayer(); // Switch to the next player's turn only if no winner
    }
  };

  // Toggle between players A and B
  const togglePlayer = () => {
    setCurrentPlayer((prevPlayer) => (prevPlayer === 'A' ? 'B' : 'A'));
  };

  // Validate movements based on piece type
  const validateMove = (piece, fromRow, fromCol, toRow, toCol) => {
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;

    switch (piece) {
      case 'P1':
      case 'P2':
      case 'P3':
        // Pawn moves one block in any direction (up, down, left, right)
        return (
          (Math.abs(rowDiff) === 1 && colDiff === 0) ||
          (rowDiff === 0 && Math.abs(colDiff) === 1)
        );
      case 'H1':
        // Hero1 moves two blocks straight in any direction (up, down, left, right)
        return (
          (Math.abs(rowDiff) === 2 && colDiff === 0) ||
          (rowDiff === 0 && Math.abs(colDiff) === 2)
        );
      case 'H2':
        // Hero2 moves one block diagonally (up-left, up-right, down-left, down-right)
        return Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 1;
      default:
        return false;
    }
  };

  const captureInPath = (grid, fromRow, fromCol, toRow, toCol, player) => {
    const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
    const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;

    let row = fromRow + rowStep;
    let col = fromCol + colStep;

    while (row !== toRow || col !== toCol) {
      if (grid[row][col] && !grid[row][col].startsWith(player)) {
        // Capture the opponent's character
        grid[row][col] = null;
      } else if (grid[row][col] && grid[row][col].startsWith(player)) {
        // Stop the movement if a friendly character is encountered
        break;
      }
      row += rowStep;
      col += colStep;
    }
  };

  const getPossibleMoves = (piece, row, col, grid, player) => {
    const moves = [];
    switch (piece) {
      case 'P1':
      case 'P2':
      case 'P3':
        if (row > 0 && (!grid[row - 1][col] || !grid[row - 1][col].startsWith(player)))
          moves.push({ direction: 'F', toRow: row - 1, toCol: col });
        if (row < 4 && (!grid[row + 1][col] || !grid[row + 1][col].startsWith(player)))
          moves.push({ direction: 'B', toRow: row + 1, toCol: col });
        if (col > 0 && (!grid[row][col - 1] || !grid[row][col - 1].startsWith(player)))
          moves.push({ direction: 'L', toRow: row, toCol: col - 1 });
        if (col < 4 && (!grid[row][col + 1] || !grid[row][col + 1].startsWith(player)))
          moves.push({ direction: 'R', toRow: row, toCol: col + 1 });
        break;
      case 'H1':
        if (row > 1 && (!grid[row - 2][col] || !grid[row - 2][col].startsWith(player)))
          moves.push({ direction: '2F', toRow: row - 2, toCol: col });
        if (row < 3 && (!grid[row + 2][col] || !grid[row + 2][col].startsWith(player)))
          moves.push({ direction: '2B', toRow: row + 2, toCol: col });
        if (col > 1 && (!grid[row][col - 2] || !grid[row][col - 2].startsWith(player)))
          moves.push({ direction: '2L', toRow: row, toCol: col - 2 });
        if (col < 3 && (!grid[row][col + 2] || !grid[row][col + 2].startsWith(player)))
          moves.push({ direction: '2R', toRow: row, toCol: col + 2 });
        break;
      case 'H2':
        if (row > 0 && col > 0 && (!grid[row - 1][col - 1] || !grid[row - 1][col - 1].startsWith(player)))
          moves.push({ direction: 'FL', toRow: row - 1, toCol: col - 1 });
        if (row > 0 && col < 4 && (!grid[row - 1][col + 1] || !grid[row - 1][col + 1].startsWith(player)))
          moves.push({ direction: 'FR', toRow: row - 1, toCol: col + 1 });
        if (row < 4 && col > 0 && (!grid[row + 1][col - 1] || !grid[row + 1][col - 1].startsWith(player)))
          moves.push({ direction: 'BL', toRow: row + 1, toCol: col - 1 });
        if (row < 4 && col < 4 && (!grid[row + 1][col + 1] || !grid[row + 1][col + 1].startsWith(player)))
          moves.push({ direction: 'BR', toRow: row + 1, toCol: col + 1 });
        break;
      default:
        break;
    }
    return moves;
  };

  const handleMoveClick = (toRow, toCol, moveName) => {
    if (selected) {
      const cellValue = grid[toRow][toCol];
      if (cellValue && cellValue.startsWith(currentPlayer)) {
        setErrorMessage('You cannot move to a spot occupied by a friendly character.');
        return;
      }
      handlePostGameMove(toRow, toCol, moveName);
    }
  };

  const checkForWinner = (grid) => {
    const playerAExists = grid.some(row => row.some(cell => cell && cell.startsWith('A')));
    const playerBExists = grid.some(row => row.some(cell => cell && cell.startsWith('B')));

    if (!playerAExists) {
      setWinner('Player B');
    } else if (!playerBExists) {
      setWinner('Player A');
    }
  };

  const handleStartClick = () => {
    setGameStarted(!gameStarted);
    setSelected(null);
    setErrorMessage('');
    setCurrentPlayer('A'); // Start the game with Player A's turn
    if (winner) {
      setWinner(null); // Reset the winner in case of a new game
      setGrid(initializeGrid()); // Reset the grid for a new game
      setMoveHistory([]); // Reset the move history for a new game
    }
  };

  return (
    <div className="App">
      <h1>5x5 Game Grid</h1>
      {!gameStarted && <p>Swap your characters in respective rows, then click "Start Game".</p>}
      {gameStarted && !winner && <p>Current Turn: Player {currentPlayer}</p>}
      <div className="grid">
        {grid.map((rowData, rowIndex) => (
          <div key={rowIndex} className="row">
            {rowData.map((cellData, colIndex) => (
              <div
                key={colIndex}
                className={`cell ${
                  selected &&
                  selected.row === rowIndex &&
                  selected.col === colIndex
                    ? 'selected'
                    : ''
                }`}
                onClick={() => handleCellClick(rowIndex, colIndex)}
              >
                {cellData || ''}
              </div>
            ))}
          </div>
        ))}
      </div>
      {!winner && (
        <button
          className="start-button"
          onClick={handleStartClick}
        >
          {gameStarted ? 'Game Started' : 'Start Game'}
        </button>
      )}
      {errorMessage && <p className="error">{errorMessage}</p>}
      {selected && !winner && <p>Selected: {selected.value}</p>}
      {gameStarted && selected && !winner && (
        <div>
          <p>Possible Moves:</p>
          {getPossibleMoves(
            selected.value.split('-')[1],
            selected.row,
            selected.col,
            grid,
            currentPlayer
          ).map((move, index) => (
            <button
              key={index}
              onClick={() => handleMoveClick(move.toRow, move.toCol, move.direction)}
            >
              {move.direction}
            </button>
          ))}
        </div>
      )}
      {gameStarted && (
        <div>
          {winner && <h2>{winner} wins!</h2>}
          {winner && (
        <button onClick={handleStartClick}>Start New Game</button>
      )}
          <h3>Move History:</h3>
          <ul>
            {moveHistory.map((move, index) => (
              <li key={index}>{move}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default App;
