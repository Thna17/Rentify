import { QRCodeCanvas } from 'qrcode.react';
import { useTranslation } from '@rentify/utils/contexts/TranslationContext';

export const KHQRCode = ({ rawQR, currency, qrCanvasId }) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="w-[220px] h-auto mx-auto mb-[24px] flex flex-col items-center rounded-[16px] shadow-[0px_5px_20px_rgba(0,0,0,0.1)] bg-white overflow-hidden border">
        <div className="relative h-[80px] bg-[#e0232d] rounded-tl-[8px] rounded-bl-[8px] flex items-center flex-col justify-center w-full">
          <img
            src="https://bredcambodia.com.kh/wp-content/uploads/2022/12/KHQR-available-here-logo-with-bg-1024x422.png"
            alt="khqr logo"
            className="w-[72px] h-[72px] p-[8px]"
          />

          <div
            className="w-full h-full  bg-white [clip-path:polygon(0_0,_calc(100%-30px)_0,_100%_20px,_100%_100%,_0_100%)]"
          />
        </div>

        <div className="flex items-center justify-center relative w-full -mt-[16px] pb-[24px] px-[16px]">
          <div className="relative inline-flex justify-center items-center">
            <QRCodeCanvas
              id={qrCanvasId}
              value={rawQR}
              size={180}
              includeMargin
              level="H"
              bgColor="#ffffff"
              fgColor="#000000"
            />
            <div className="w-[36px] h-[36px] rounded-full bg-[#0A4B64] flex items-center justify-center absolute z-[1]">
              <span className="text-white font-bold text-[24px] leading-none">
                {getCurrencySymbol(currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[20px] font-semibold text-gray-900 mb-[8px] text-center">
        {t('dashboard.pos.scan_to_pay')}
      </p>
      <p className="text-[14px] text-gray-600 text-center">
        {t('dashboard.pos.use_khqr_app')}
      </p>
    </>
  );
};

const getCurrencySymbol = (currency) => {
  const c = (currency || '').toUpperCase();
  return c === 'KHR' ? '៛' : '$';
};
