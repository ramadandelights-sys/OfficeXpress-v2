import { FormField, FormItem, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface HoneypotFieldsProps {
  control: any;
}

// Honeypot fields to trap bots - invisible to users but filled by automated scripts
export function HoneypotFields({ control }: HoneypotFieldsProps) {
  return (
    <div className="honeypot-fields" style={{
      position: 'absolute',
      left: '-9999px',
      width: '1px',
      height: '1px',
      opacity: 0,
      overflow: 'hidden',
      zIndex: -1,
      pointerEvents: 'none'
    }}>
      {/* Email confirmation field - looks legitimate to bots */}
      <FormField
        control={control}
        name="email_confirm"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                {...field}
                type="email"
                placeholder="Confirm your email"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />
            </FormControl>
          </FormItem>
        )}
      />
      
      {/* Website field - commonly auto-filled by bots */}
      <FormField
        control={control}
        name="website"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                {...field}
                type="url"
                placeholder="Your website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />
            </FormControl>
          </FormItem>
        )}
      />
      
      {/* Company URL field - appears business-related */}
      <FormField
        control={control}
        name="company_url"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                {...field}
                type="url"
                placeholder="Company website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />
            </FormControl>
          </FormItem>
        )}
      />
      
      {/* Secondary phone field - looks like optional field */}
      <FormField
        control={control}
        name="phone_secondary"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                {...field}
                type="tel"
                placeholder="Secondary phone (optional)"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}