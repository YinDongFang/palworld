import { logs, status } from '#/app/connect';

export default async function Page({ params }: { params: { id: string } }) {
  const statusValue = status();
  return (
    <div>
      <div>
        <h3 styles={{ color: statusValue === 'CONNECTED' ? 'green' : 'red' }}>
          Status: {statusValue}
        </h3>
      </div>
      <div>
        {
          logs.map(log => {
            <div styles={{ color: log.level === 'info' ? 'green' : log.level === 'error' ? 'red' : 'orange' }}>{log.level}: {log.msgs.map(msg => typeof msg === 'string' ? msg : JSON.stringify(msg)).join(',')}</div>
          })
        }
      </div>
    </div>
  );
}
