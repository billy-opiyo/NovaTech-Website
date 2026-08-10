export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="glass border-t border-white/10 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-lg font-bold mb-4">ElectroBuy</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your trusted electronics store in Kenya. Genuine products, warranty, fast delivery.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Customer Service</h4>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>Contact Us</li>
            <li>FAQs</li>
            <li>Return Policy</li>
            <li>Warranty</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Quick Links</h4>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>About Us</li>
            <li>Shop</li>
            <li>Track Order</li>
            <li>Blog</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Stay Connected</h4>
          <div className="flex gap-3">
            <span className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">FB</span>
            <span className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">IG</span>
            <span className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">WA</span>
          </div>
          <p className="text-xs mt-4 text-gray-500">© {year} ElectroBuy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
