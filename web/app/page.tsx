import Link from 'next/link';

export default function Page() {
  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Hướng dẫn Farm Airdrop</h1>

      <section className="rounded border bg-white p-4 space-y-2">
        <h2 className="font-semibold">Menu chính</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <Link className="underline" href="/">Guide</Link> — Trang hướng dẫn tổng quan và quy trình làm việc.
          </li>
          <li>
            <Link className="underline" href="/admin/wallet-groups">Wallet Groups</Link> — Tạo nhóm và sinh ví hàng loạt (EVM/Solana) theo index.
          </li>
          <li>
            <Link className="underline" href="/admin/wallets">Wallets</Link> — Quản lý ví đơn lẻ, xuất private key CSV phục vụ import thủ công.
          </li>
          <li>
            <Link className="underline" href="/admin/rpc">RPC</Link> — Cấu hình các RPC endpoint theo chain, có trọng số/kiểm tra trạng thái.
          </li>
          <li>
            <Link className="underline" href="/admin">Admin</Link> — Khu vực quản trị mở rộng (task templates, cấu hình nâng cao…).
          </li>
        </ul>
      </section>

      <section className="rounded border bg-white p-4 space-y-2">
        <h2 className="font-semibold">Tạo chung (chuẩn bị nền tảng)</h2>
        <p>- Vào <Link className="underline" href="/admin/wallet-groups">Admin → Wallet Groups</Link> để tạo nhóm và sinh ví hàng loạt.</p>
        <p>- Hỗ trợ Account type: EVM (m/44'/60'/0'/0/i) và Solana (m/44'/501'/0'/0/i). Chọn số lượng ví và index bắt đầu.</p>
        <p>- Kiểm tra danh sách ví, có thể export CSV ở <Link className="underline" href="/admin/wallets">Admin → Wallets</Link>.</p>
        <p>- Cấu hình RPC: vào <Link className="underline" href="/admin/rpc">Admin → RPC</Link> để thêm endpoint cho các chain testnet (ưu tiên giải pháp miễn phí).</p>
      </section>

      <section className="rounded border bg-white p-4 space-y-2">
        <h2 className="font-semibold">Tạo dự án</h2>
        <p>- Tạo mới hoặc quản lý dự án tại <Link className="underline" href="/projects">Projects</Link> (gom các task theo chiến dịch/chain).</p>
        <p>- Khai báo tham số cần thiết cho dự án (ví dụ: nhóm ví dùng, chain, ngân sách gas testnet, tần suất chạy…).</p>
        <p>- Có thể gắn kèm các mẫu tác vụ (task templates) dùng chung cho dự án để tái sử dụng.</p>
      </section>

      <section className="rounded border bg-white p-4 space-y-2">
        <h2 className="font-semibold">Chạy farming</h2>
        <p>- Vào <Link className="underline" href="/tasks">Tasks</Link> để xem/khởi chạy các tác vụ theo nhóm ví hoặc theo dự án.</p>
        <p>- Worker hỗ trợ action <code>http_request</code> để tự động gọi faucet qua HTTP dựa trên <i>task_templates.params</i> (url/method/headers/body) với placeholder dữ liệu ví.</p>
        <p>- Chạy thử với số lượng nhỏ để kiểm tra tỉ lệ thành công và hạn mức faucet; sau đó mở rộng theo nhóm.</p>
      </section>

      <section className="rounded border bg-white p-4 space-y-2">
        <h2 className="font-semibold">Workflow Claim (Faucet/Quest)</h2>
        <ol className="list-decimal pl-6 space-y-1">
          <li>
            Chuẩn bị ví: tạo nhóm ví tại <Link className="underline" href="/admin/wallet-groups">Admin → Wallet Groups</Link> (EVM/Solana), kiểm tra và export ở <Link className="underline" href="/admin/wallets">Admin → Wallets</Link> nếu cần.
          </li>
          <li>
            Cấu hình RPC testnet cho chain mục tiêu tại <Link className="underline" href="/admin/rpc">Admin → RPC</Link> (ưu tiên endpoint miễn phí, đặt weight/active tương ứng).
          </li>
          <li>
            Khai báo faucet/quest: tạo <i>Task Template</i> ở <Link className="underline" href="/admin/task-templates">Admin → Task Templates</Link> với action <code>http_request</code> và params: <code>url</code>, <code>method</code>, <code>headers</code>, <code>body</code>.
            Sử dụng placeholders dữ liệu ví (ví dụ: địa chỉ, chain) trong body để tự động hoá.
          </li>
          <li>
            Tạo dự án tại <Link className="underline" href="/projects">Projects</Link>, gắn nhóm ví và chọn các template tương ứng cho chiến dịch claim.
          </li>
          <li>
            Chạy claim: vào <Link className="underline" href="/tasks">Tasks</Link> hoặc <Link className="underline" href="/admin/tasks">Admin → Tasks</Link> để chạy theo nhóm/dự án. Bắt đầu với quy mô nhỏ để thăm dò tỉ lệ thành công/hạn mức.
          </li>
          <li>
            Theo dõi kết quả: xem <Link className="underline" href="/admin/task-runs">Admin → Task Runs</Link> để theo dõi trạng thái, response, lỗi; điều chỉnh headers/body hoặc tần suất nếu cần.
          </li>
          <li>
            Lặp lại theo lịch: có thể cấu hình lịch chạy trong dự án hoặc chạy thủ công định kỳ tuỳ hạn mức faucet/quest.
          </li>
        </ol>
        <p className="text-sm text-gray-600">Gợi ý: Nên phân bổ thời gian chạy ngẫu nhiên, xoay vòng RPC và user-agent (nếu faucet yêu cầu) để giảm tỉ lệ bị rate limit.</p>
      </section>

      <section className="rounded border bg-white p-4 space-y-2">
        <h2 className="font-semibold">Ghi chú bảo mật</h2>
        <p>- Mnemonic/private key hiện lưu DB cho mục đích test. Không dùng cho tài sản thật nếu chưa mã hóa và tách logic generate sang server.</p>
      </section>
    </main>
  );
}

