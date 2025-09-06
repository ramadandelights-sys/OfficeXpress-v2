// Script to create initial legal pages for OfficeXpress
const termsContent = `<h1>Terms and Conditions</h1>
<p><strong>Effective Date:</strong> ${new Date().toLocaleDateString()}</p>

<h2>1. Introduction</h2>
<p>Welcome to OfficeXpress, a premier transportation services provider based in Bangladesh. These Terms and Conditions ("Terms") govern your use of our website and services. By accessing our website or using our services, you agree to be bound by these Terms.</p>

<h2>2. Company Information</h2>
<p><strong>Company Name:</strong> OfficeXpress Transportation Services<br>
<strong>Location:</strong> Dhanmondi, Dhaka 1205, Bangladesh<br>
<strong>Email:</strong> info@officexpress.org<br>
<strong>Phone:</strong> +880 1XXX-XXXXXX</p>

<h2>3. Services Offered</h2>
<p>OfficeXpress provides the following transportation services within Bangladesh:</p>
<ul>
<li><strong>Corporate Transportation:</strong> Employee shuttle services, business meeting transportation, and corporate event logistics</li>
<li><strong>Vehicle Rental:</strong> Car rental services with and without drivers for business and personal use</li>
<li><strong>Airport Transfers:</strong> Reliable airport pickup and drop-off services</li>
<li><strong>City Tours:</strong> Guided tours of Dhaka and other major cities in Bangladesh</li>
<li><strong>Vendor Partnership:</strong> Registration and management of transportation service providers</li>
</ul>

<h2>4. Booking and Reservations</h2>
<p>4.1. All bookings must be made through our official website or authorized channels.<br>
4.2. Corporate bookings require advance notice and may be subject to availability.<br>
4.3. Vehicle rental bookings must specify pickup and drop-off locations within Bangladesh.<br>
4.4. We reserve the right to decline any booking that does not meet our service criteria.</p>

<h2>5. Payment Terms</h2>
<p>5.1. Payment methods accepted include cash, bank transfer, and mobile banking (bKash, Nagad, Rocket).<br>
5.2. Corporate clients may be offered credit terms subject to approval.<br>
5.3. All prices are quoted in Bangladeshi Taka (BDT) unless otherwise specified.<br>
5.4. Payment terms for corporate accounts are net 30 days from invoice date.</p>

<h2>6. Cancellation and Refund Policy</h2>
<p>6.1. Cancellations made 24 hours before scheduled service: Full refund<br>
6.2. Cancellations made 12-24 hours before: 50% refund<br>
6.3. Cancellations made less than 12 hours before: No refund<br>
6.4. Emergency cancellations will be reviewed on a case-by-case basis.</p>

<h2>7. Driver and Vehicle Standards</h2>
<p>7.1. All drivers are licensed and experienced professionals.<br>
7.2. Vehicles undergo regular maintenance and safety inspections.<br>
7.3. We maintain comprehensive insurance coverage for all vehicles.<br>
7.4. Drivers are required to follow traffic laws and safety regulations of Bangladesh.</p>

<h2>8. Liability and Insurance</h2>
<p>8.1. OfficeXpress maintains appropriate insurance coverage for passenger transportation.<br>
8.2. We are not liable for delays caused by traffic, weather, or other circumstances beyond our control.<br>
8.3. Maximum liability for service interruption is limited to the cost of the specific service.<br>
8.4. Passengers are advised to maintain their own travel insurance for additional coverage.</p>

<h2>9. User Responsibilities</h2>
<p>9.1. Customers must provide accurate pickup and destination information.<br>
9.2. Corporate clients must ensure authorized personnel make bookings.<br>
9.3. Customers must be present at the designated pickup time and location.<br>
9.4. Any damage to vehicles caused by passengers will be charged separately.</p>

<h2>10. Vendor Partnership Terms</h2>
<p>10.1. Vendor registration is subject to verification of licenses and insurance.<br>
10.2. Vendor vehicles must meet safety and quality standards.<br>
10.3. Vendors must maintain valid driving licenses and vehicle registrations.<br>
10.4. Partnership agreements are renewable annually subject to performance review.</p>

<h2>11. Data Protection and Privacy</h2>
<p>11.1. We collect and process personal data in accordance with Bangladesh's data protection laws.<br>
11.2. Customer information is used solely for service delivery and communication.<br>
11.3. We do not share personal data with third parties without consent.<br>
11.4. For detailed information, please refer to our Privacy Policy.</p>

<h2>12. Governing Law</h2>
<p>These Terms are governed by the laws of Bangladesh. Any disputes will be resolved through the courts of Dhaka, Bangladesh.</p>

<h2>13. Contact Information</h2>
<p>For questions about these Terms and Conditions, please contact us at:<br>
Email: info@officexpress.org<br>
Phone: +880 1XXX-XXXXXX<br>
Address: Dhanmondi, Dhaka 1205, Bangladesh</p>

<h2>14. Updates to Terms</h2>
<p>We reserve the right to update these Terms and Conditions. Changes will be posted on our website with the effective date. Continued use of our services constitutes acceptance of updated Terms.</p>`;

const privacyContent = `<h1>Privacy Policy</h1>
<p><strong>Effective Date:</strong> ${new Date().toLocaleDateString()}</p>

<h2>1. Introduction</h2>
<p>OfficeXpress Transportation Services ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our transportation services or visit our website.</p>

<h2>2. Information We Collect</h2>

<h3>2.1 Personal Information</h3>
<p>We collect the following types of personal information:</p>
<ul>
<li><strong>Contact Information:</strong> Name, email address, phone number, office address</li>
<li><strong>Corporate Details:</strong> Company name, business registration information</li>
<li><strong>Service Details:</strong> Pickup/drop-off locations, travel dates and times</li>
<li><strong>Payment Information:</strong> Billing details (processed through secure payment partners)</li>
<li><strong>Vendor Information:</strong> Business licenses, vehicle registration, insurance details</li>
</ul>

<h3>2.2 Technical Information</h3>
<p>When you visit our website, we automatically collect:</p>
<ul>
<li>IP address and location data</li>
<li>Browser type and version</li>
<li>Device information</li>
<li>Pages visited and time spent on site</li>
<li>Referring website information</li>
</ul>

<h3>2.3 Cookies and Tracking</h3>
<p>We use cookies and similar technologies to:</p>
<ul>
<li>Improve website functionality and user experience</li>
<li>Analyze website traffic and usage patterns</li>
<li>Provide personalized content and recommendations</li>
<li>Track marketing campaign effectiveness</li>
</ul>

<h2>3. How We Use Your Information</h2>

<h3>3.1 Service Delivery</h3>
<ul>
<li>Process and manage transportation bookings</li>
<li>Coordinate pickup and drop-off services</li>
<li>Communicate service updates and confirmations</li>
<li>Handle billing and payment processing</li>
</ul>

<h3>3.2 Business Operations</h3>
<ul>
<li>Manage corporate client relationships</li>
<li>Coordinate with vendor partners</li>
<li>Improve service quality and efficiency</li>
<li>Conduct business analysis and planning</li>
</ul>

<h3>3.3 Marketing and Communication</h3>
<ul>
<li>Send service notifications and updates</li>
<li>Provide customer support</li>
<li>Share relevant service offerings</li>
<li>Conduct customer satisfaction surveys</li>
</ul>

<h2>4. Information Sharing and Disclosure</h2>

<h3>4.1 Service Partners</h3>
<p>We may share information with:</p>
<ul>
<li><strong>Drivers and Vendors:</strong> Necessary details for service delivery</li>
<li><strong>Payment Processors:</strong> Billing information for transaction processing</li>
<li><strong>Technology Partners:</strong> Service providers for website and system maintenance</li>
</ul>

<h3>4.2 Legal Requirements</h3>
<p>We may disclose information when required by:</p>
<ul>
<li>Bangladesh law enforcement agencies</li>
<li>Court orders or legal proceedings</li>
<li>Government regulatory requirements</li>
<li>Protection of our legal rights and safety</li>
</ul>

<h3>4.3 Business Transfers</h3>
<p>In the event of a merger, acquisition, or sale of assets, customer information may be transferred as part of the business transaction.</p>

<h2>5. Data Security</h2>

<h3>5.1 Security Measures</h3>
<p>We implement appropriate security measures to protect your information:</p>
<ul>
<li>Encrypted data transmission (SSL certificates)</li>
<li>Secure server infrastructure</li>
<li>Access controls and authentication</li>
<li>Regular security audits and updates</li>
</ul>

<h3>5.2 Data Retention</h3>
<p>We retain personal information for as long as necessary to:</p>
<ul>
<li>Provide ongoing services</li>
<li>Comply with legal obligations</li>
<li>Resolve disputes and enforce agreements</li>
<li>Maintain business records as required by Bangladesh law</li>
</ul>

<h2>6. Your Privacy Rights</h2>

<h3>6.1 Access and Correction</h3>
<p>You have the right to:</p>
<ul>
<li>Access your personal information we hold</li>
<li>Request corrections to inaccurate data</li>
<li>Update your contact preferences</li>
<li>Request deletion of unnecessary data</li>
</ul>

<h3>6.2 Communication Preferences</h3>
<p>You can opt out of marketing communications by:</p>
<ul>
<li>Clicking unsubscribe links in emails</li>
<li>Contacting our customer service</li>
<li>Updating preferences in your account</li>
</ul>

<h2>7. International Data Transfers</h2>
<p>Our services operate primarily within Bangladesh. Any international data transfers are conducted with appropriate safeguards and in compliance with Bangladesh data protection laws.</p>

<h2>8. Children's Privacy</h2>
<p>Our services are not directed to individuals under 18 years of age. We do not knowingly collect personal information from children without parental consent.</p>

<h2>9. Third-Party Links</h2>
<p>Our website may contain links to third-party websites. We are not responsible for the privacy practices of external sites. We encourage users to read privacy policies of linked websites.</p>

<h2>10. Analytics and Marketing Tools</h2>

<h3>10.1 Google Analytics</h3>
<p>We use Google Analytics to understand website usage patterns. Google Analytics may collect information about your visits to our website and other websites.</p>

<h3>10.2 Facebook Pixel</h3>
<p>We use Facebook Pixel to measure the effectiveness of our advertising campaigns and provide personalized marketing content.</p>

<h3>10.3 Opt-Out Options</h3>
<p>You can opt out of analytics tracking through:</p>
<ul>
<li>Browser privacy settings</li>
<li>Google Analytics opt-out browser add-on</li>
<li>Cookie management preferences</li>
</ul>

<h2>11. Changes to Privacy Policy</h2>
<p>We may update this Privacy Policy to reflect changes in our practices or legal requirements. Updated policies will be posted on our website with the revision date. Continued use of our services indicates acceptance of the updated policy.</p>

<h2>12. Contact Information</h2>
<p>For privacy-related questions or concerns, please contact us:</p>
<ul>
<li><strong>Email:</strong> info@officexpress.org</li>
<li><strong>Phone:</strong> +880 1XXX-XXXXXX</li>
<li><strong>Address:</strong> Dhanmondi, Dhaka 1205, Bangladesh</li>
</ul>

<h2>13. Compliance with Bangladesh Laws</h2>
<p>This Privacy Policy is designed to comply with Bangladesh's data protection and privacy laws. We regularly review our practices to ensure ongoing compliance with local regulations.</p>

<h2>14. Data Protection Officer</h2>
<p>For specific data protection inquiries, you may contact our designated Data Protection Officer at the contact information provided above.</p>`;

console.log("Terms Content:", termsContent.substring(0, 200) + "...");
console.log("Privacy Content:", privacyContent.substring(0, 200) + "...");