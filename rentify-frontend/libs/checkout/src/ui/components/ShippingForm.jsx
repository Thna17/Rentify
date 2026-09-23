import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { Textarea } from '@rentify/shared/ui/textarea';
import { Checkbox } from '@rentify/shared/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@rentify/shared/ui/select';
import { ClipboardList, Phone, MapPin, FileText } from 'lucide-react';

export const ShippingForm = ({
  formData,
  handleInputChange,
  fieldErrors,
  t,
  setFormData,
  provinces,
  districts,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t('checkout.name')}</Label>
          <div className="relative">
            <ClipboardList className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="pl-10"
              placeholder={t('checkout.name_placeholder')}
            />
          </div>
          {fieldErrors.name && (
            <p className="text-sm text-destructive">{fieldErrors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t('checkout.phone')}</Label>
          <div className="relative">
            <div className="absolute left-0 top-0 h-full flex items-center pl-3 pointer-events-none">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="ml-2 text-sm  text-black px-2  rounded-md  bg-muted border">+855</span>
            </div>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                setFormData((prev) => ({ ...prev, phone: value }));
              }}
              className="pl-24"
              type="tel"
              placeholder="123456789"
            />
          </div>
          {fieldErrors.phone && (
            <p className="text-sm text-destructive">{fieldErrors.phone}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="province">{t('checkout.province')}</Label>
            <Select
              value={formData.province}
              onValueChange={(value) => {
                setFormData((prev) => ({
                  ...prev,
                  province: value,
                  district: '',
                }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('checkout.select_province')} />
              </SelectTrigger>
              <SelectContent>
                {provinces.map((province) => (
                  <SelectItem key={province} value={province}>
                    {province}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.province && (
              <p className="text-sm text-destructive">{fieldErrors.province}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="district">{t('checkout.district')}</Label>
            <Select
              value={formData.district}
              onValueChange={(value) => {
                setFormData((prev) => ({ ...prev, district: value }));
              }}
              disabled={!formData.province}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('checkout.select_district')} />
              </SelectTrigger>
              <SelectContent>
                {(districts[formData.province] || []).map((district) => (
                  <SelectItem key={district} value={district}>
                    {district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.district && (
              <p className="text-sm text-destructive">{fieldErrors.district}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="street">{t('checkout.street')}</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Textarea
              id="street"
              name="street"
              value={formData.street}
              onChange={handleInputChange}
              className="pl-10 min-h-[80px]"
              placeholder={t('checkout.street_placeholder')}
            />
          </div>
          {fieldErrors.street && (
            <p className="text-sm text-destructive">{fieldErrors.street}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">{t('checkout.delivery_note_placeholder')}</Label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Textarea
              id="note"
              name="note"
              value={formData.note}
              onChange={handleInputChange}
              className="pl-10 min-h-[100px]"
              placeholder={t('checkout.delivery_note_placeholder')}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="saveAddress"
            checked={formData.saveAddress}
            onCheckedChange={(checked) => {
              setFormData({
                ...formData,
                saveAddress: checked,
              });
            }}
          />
          <Label htmlFor="saveAddress" className="text-sm font-medium leading-none">
            {t('checkout.save_address')}
          </Label>
        </div>
      </div>
    </div>
  );
};