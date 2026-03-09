import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';
import './SeatManagement.css';

const SeatManagement = () => {
    const [numSeats, setNumSeats] = useState<number>(0);
    const [generatedSeats, setGeneratedSeats] = useState<string[]>([]);

    const handleGenerate = () => {
        if (!numSeats || numSeats <= 0) {
            toast.error('Please enter a valid number of seats.');
            return;
        }

        if (numSeats > 100) {
            toast.error('Cannot generate more than 100 seats at once.');
            return;
        }

        const seats = Array.from({ length: numSeats }, (_, i) => `C${i + 1}`);
        setGeneratedSeats(seats);
        toast.success(`Generated ${numSeats} seat QR codes.`);
    };

    const getSeatMenuUrl = (seatLabel: string) => {
        const encryptedSeat = btoa(seatLabel);
        return `${window.location.origin}/customer/order/${encryptedSeat}`;
    };

    const handleDownloadQR = (seatLabel: string) => {
        const canvas = document.getElementById(`qr-code-${seatLabel}`) as HTMLCanvasElement;
        if (canvas) {
            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `Seat-${seatLabel}-QR.png`;
            link.href = url;
            link.click();
        }
    };

    const handleShareQR = async (seatLabel: string) => {
        const canvas = document.getElementById(`qr-code-${seatLabel}`) as HTMLCanvasElement;
        const menuUrl = getSeatMenuUrl(seatLabel);

        if (!canvas || !navigator.share) {
            toast.error('Web Share is not supported on this browser.');
            return;
        }

        try {
            canvas.toBlob(async (blob) => {
                if (!blob) return;
                const file = new File([blob], `Seat-${seatLabel}-QR.png`, { type: 'image/png' });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: `QR Menu for Seat ${seatLabel}`,
                        text: `Scan this QR to order for Seat ${seatLabel}`,
                        url: menuUrl
                    });
                } else {
                    await navigator.share({
                        title: `QR Menu for Seat ${seatLabel}`,
                        text: `Open the menu for Seat ${seatLabel}: ${menuUrl}`,
                        url: menuUrl
                    });
                }
            }, 'image/png');
        } catch (err) {
            console.error('Share error:', err);
        }
    };

    const handlePrintAll = () => {
        window.print();
    };

    return (
        <div className="seat-management-container">
            <h3>Seat QR Code Generator</h3>

            <div className="seat-controls">
                <div className="seat-input-group">
                    <label htmlFor="numSeats">Number of Seats (e.g. C1 to C...)</label>
                    <input
                        type="number"
                        id="numSeats"
                        min="1"
                        max="100"
                        value={numSeats || ''}
                        onChange={(e) => setNumSeats(parseInt(e.target.value) || 0)}
                        placeholder="Enter quantity"
                    />
                </div>
                <button className="btn-generate" onClick={handleGenerate}>
                    Generate QRs
                </button>
                {generatedSeats.length > 0 && (
                    <button className="btn-print" onClick={handlePrintAll}>
                        Print All QRs
                    </button>
                )}
            </div>

            {generatedSeats.length > 0 && (
                <div className="qr-grid print-area">
                    {generatedSeats.map(seatLabel => (
                        <div key={seatLabel} className="qr-card">
                            <h4 className="qr-seat-label">{seatLabel}</h4>
                            <div className="qr-canvas-container">
                                <QRCodeCanvas
                                    id={`qr-code-${seatLabel}`}
                                    value={getSeatMenuUrl(seatLabel)}
                                    size={180}
                                    level="M"
                                    includeMargin={true}
                                />
                            </div>
                            <div className="qr-actions-row">
                                {!!navigator.share && (
                                    <button
                                        className="qr-action-btn"
                                        onClick={() => handleShareQR(seatLabel)}
                                        title="Share QR"
                                    >
                                        📤 Share
                                    </button>
                                )}
                                <button
                                    className="qr-action-btn"
                                    onClick={() => handleDownloadQR(seatLabel)}
                                    title="Download PNG"
                                >
                                    ⬇️ Save
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SeatManagement;
